import { PayOS } from '@payos/node';
import { FilterQuery } from 'mongoose';
import {
  Invoice,
  IInvoice,
  InvoiceStatus,
  PaymentMethod,
} from '../../../models/invoice.model';
import {
  AppError,
  NotFoundError,
} from '../../../common/utils/AppError';
import { env } from '../../../configs/env.config';
import { Appointment, BookingStatus } from '../../../models/appointment.model';
import { AppointmentService } from '../../../models/appointmentService.model';
import { Customer } from '../../../models/customer.model';
import { TierConfig } from '../../../models/tierConfig.model';
import mongoose from 'mongoose';
import { ICreateInvoiceRequest } from '../interfaces/invoice.interface';

// ─────────────────────────────────────────────────────────────
// PayOS Client
// ─────────────────────────────────────────────────────────────

const payosClient = new PayOS({
  clientId: env.PAYOS_CLIENT_ID,
  apiKey: env.PAYOS_API_KEY,
  checksumKey: env.PAYOS_CHECKSUM_KEY,
});

// ─────────────────────────────────────────────────────────────
// Hằng số tích điểm: 20.000 VNĐ = 1 membership point
// ─────────────────────────────────────────────────────────────
const VND_PER_POINT = 1_000;

/**
 * Tính số điểm tích luỹ từ số tiền thanh toán.
 * Làm tròn xuống (floor) — chỉ đủ đơn vị mới được điểm.
 */
function calcPoints(totalAmount: number): number {
  return Math.floor(totalAmount / VND_PER_POINT);
}

/**
 * Cộng membership_points cho customer và tự động
 * upgrade tier nếu điểm mới vượt ngưỡng tier tiếp theo.
 *
 * @param customerId  ObjectId của customer
 * @param earnedPoints  Số điểm cần cộng thêm
 * @param session  Mongoose session (dùng chung với transaction)
 */
async function addMembershipPoints(
  customerId: mongoose.Types.ObjectId,
  earnedPoints: number,
  session: mongoose.ClientSession,
): Promise<void> {
  if (earnedPoints <= 0) return;

  // 1. Cộng điểm
  const customer = await Customer.findByIdAndUpdate(
    customerId,
    { $inc: { membership_points: earnedPoints } },
    { new: true, session },
  );

  if (!customer) {
    throw new Error(`Customer ${customerId} not found when adding points`);
  }

  // 2. Kiểm tra có cần upgrade tier không
  //    Lấy tier cao nhất mà customer đủ điều kiện (min_membership_points <= điểm hiện tại)
  //    Chỉ upgrade (không bao giờ downgrade)
  const newTier = await TierConfig.findOne({
    min_membership_points: { $lte: customer.membership_points },
  })
    .sort({ min_membership_points: -1 })
    .session(session);

  if (newTier && !newTier._id.equals(customer.tier_id)) {
    // Lấy tier hiện tại để so sánh, chỉ cập nhật nếu tier mới có min cao hơn
    const currentTier = await TierConfig.findById(customer.tier_id).session(session);
    if (!currentTier || newTier.min_membership_points > currentTier.min_membership_points) {
      customer.tier_id = newTier._id as mongoose.Types.ObjectId;
      await customer.save({ session });
    }
  }
}

export class InvoiceService {
  async createInvoice(
    appointmentId: string,
    opts: Omit<ICreateInvoiceRequest, 'appointment_id'> = {},
  ): Promise<IInvoice> {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    if (appointment.booking_status !== BookingStatus.WASHED) {
      throw new AppError(
        `Chỉ có thể tạo hóa đơn khi xe đã được rửa xong (trạng thái "washed"). Trạng thái hiện tại: "${appointment.booking_status}"`,
        400,
      );
    }

    // Kiểm tra invoice đã tồn tại chưa (1 appointment → 1 invoice)
    const existing = await Invoice.findOne({ appointment_id: appointmentId });
    if (existing) {
      if (existing.invoice_status === InvoiceStatus.PAID) {
        throw new AppError('Đơn này đã được thanh toán', 400);
      }
      return existing;
    }

    // Lấy danh sách dịch vụ và tính subtotal
    const services = await AppointmentService.find({ appointment_id: appointmentId });
    if (!services.length) {
      throw new AppError('Appointment chưa có dịch vụ nào', 400);
    }

    const subtotal = services.reduce((sum, s) => sum + s.price_snapshot, 0);
    const discount_amount = opts.discount_amount ?? 0;
    const tax_amount = Math.round((subtotal - discount_amount) * (opts.tax_rate ?? 0));
    const total = subtotal - discount_amount + tax_amount;

    if (total <= 0) {
      throw new AppError('Tổng tiền phải lớn hơn 0', 400);
    }

    const invoice = await Invoice.create({
      appointment_id: appointment._id,
      customer_id: appointment.customer_id,
      subtotal,
      discount_amount,
      tax_amount,
      total,
      invoice_status: InvoiceStatus.DRAFT,
      promotion_id: opts.promotion_id ?? null,
      customer_voucher_id: opts.customer_voucher_id ?? null,
      vat_requested: opts.vat_requested ?? false,
      tax_code: opts.tax_code ?? null,
    });

    return invoice;
  }
  // ───────────────────────────────────────────────────────────
  // 1. Create payment link
  // ───────────────────────────────────────────────────────────

  async createPaymentLink(
    invoiceId: string,
    expireMinutes = 30,
  ): Promise<IInvoice> {
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Kiểm tra appointment phải ở trạng thái "washed"
    if (invoice.appointment_id) {
      const appt = await Appointment.findById(invoice.appointment_id);
      if (!appt || appt.booking_status !== BookingStatus.WASHED) {
        throw new AppError(
          `Chỉ có thể tạo link thanh toán khi xe đã được rửa xong (trạng thái "washed"). Trạng thái hiện tại: "${appt?.booking_status ?? 'không tìm thấy'}"`,
          400,
        );
      }
    }

    if (invoice.invoice_status === InvoiceStatus.PAID) {
      throw new AppError('Hóa đơn đã được thanh toán', 400);
    }

    // Nếu đang chờ thanh toán (đã có link), trả về link cũ để dùng tiếp
    if (invoice.invoice_status === InvoiceStatus.PENDING && invoice.checkout_url) {
      return invoice;
    }

    // Nếu đã huỷ, cho phép tạo link mới bằng cách reset về DRAFT
    if (invoice.invoice_status === InvoiceStatus.CANCELLED) {
      invoice.invoice_status = InvoiceStatus.DRAFT;
    }

    if (invoice.invoice_status !== InvoiceStatus.DRAFT) {
      throw new AppError(
        `Invoice status is "${invoice.invoice_status}", expected "draft"`,
        400
      );
    }

    const expireAt = new Date(
      Date.now() + expireMinutes * 60 * 1000,
    );

    const orderCode = Date.now();

    const payosResponse =
      await payosClient.paymentRequests.create({
        orderCode,
        amount: invoice.total,
        description: invoice.invoice_number.substring(0, 25),
        returnUrl: env.PAYOS_RETURN_URL,
        cancelUrl: env.PAYOS_CANCEL_URL,
        expiredAt: Math.floor(expireAt.getTime() / 1000),
      });

    invoice.invoice_status = InvoiceStatus.PENDING;
    invoice.payment_method = PaymentMethod.BANK;
    invoice.order_code = orderCode;
    invoice.checkout_url = payosResponse.checkoutUrl;
    invoice.qr_code = payosResponse.qrCode;
    invoice.transfer_content =
      payosResponse.paymentLinkId ?? null;
    invoice.expired_at = expireAt;

    return invoice.save();
  }

  // ───────────────────────────────────────────────────────────
  // 2. Webhook  ← THÊM: cộng điểm sau khi PayOS xác nhận PAID
  // ───────────────────────────────────────────────────────────

  async handleWebhook(payload: any): Promise<void> {
    const session = await mongoose.startSession();

    try {
      const data = await payosClient.webhooks.verify(payload);

      if (data.code !== '00') {
        return;
      }

      await session.withTransaction(async () => {
        const invoice = await Invoice.findOneAndUpdate(
          {
            order_code: data.orderCode,
          },
          {
            $set: {
              invoice_status: InvoiceStatus.PAID,
              transaction_ref: data.reference,
              paid_at: new Date(),
              is_verified: true,
            },
          },
          {
            new: true,
            session,
          }
        );

        if (!invoice) {
          throw new Error('Invoice not found');
        }

        if (invoice.appointment_id) {
          const appointment = await Appointment.findByIdAndUpdate(
            invoice.appointment_id,
            {
              $set: {
                booking_status: 'completed',
                completed_at: new Date(),
              },
            },
            {
              new: true,
              session,
            }
          );

          if (!appointment) {
            throw new Error('Appointment not found');
          }
        }

        // ── Cộng membership points ──────────────────────────
        const earned = calcPoints(invoice.total);
        await addMembershipPoints(invoice.customer_id, earned, session);
        // ────────────────────────────────────────────────────
      });
    } catch (error) {
      console.error('Webhook processing failed:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  // ───────────────────────────────────────────────────────────
  // 3. Cancel payment link
  // ───────────────────────────────────────────────────────────

  async cancelPaymentLink(
    invoiceId: string,
    reason?: string,
  ): Promise<IInvoice> {
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (invoice.invoice_status !== InvoiceStatus.PENDING) {
      throw new AppError(
        `Cannot cancel invoice with status: ${invoice.invoice_status}`,
        400
      );
    }

    if (invoice.order_code) {
      await payosClient.paymentRequests.cancel(
        String(invoice.order_code),
        reason,
      );
    }

    invoice.invoice_status = InvoiceStatus.CANCELLED;

    return invoice.save();
  }

  // ───────────────────────────────────────────────────────────
  // 4. Sync invoice status  ← THÊM: cộng điểm nếu vừa PAID
  // ───────────────────────────────────────────────────────────

  async syncInvoiceStatus(
    invoiceId: string,
  ): Promise<IInvoice> {
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (
      invoice.invoice_status !== InvoiceStatus.PENDING ||
      !invoice.order_code
    ) {
      return invoice;
    }

    const info =
      await payosClient.paymentRequests.get(
        String(invoice.order_code),
      );

    if (info.status === 'PAID') {
      invoice.invoice_status = InvoiceStatus.PAID;
      invoice.transaction_ref =
        info.transactions?.[0]?.reference ?? null;
      invoice.paid_at = new Date();
      invoice.is_verified = true;

      const saved = await invoice.save();

      // Cộng điểm & Cập nhật trạng thái Appointment
      const earned = calcPoints(saved.total);
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await addMembershipPoints(saved.customer_id, earned, session);
          if (saved.appointment_id) {
            await Appointment.findByIdAndUpdate(
              saved.appointment_id,
              {
                $set: {
                  booking_status: 'completed',
                  completed_at: new Date(),
                },
              },
              { session }
            );
          }
        });
      } finally {
        await session.endSession();
      }

      return saved;
    }

    if (
      info.status === 'CANCELLED' ||
      info.status === 'EXPIRED'
    ) {
      invoice.invoice_status =
        InvoiceStatus.CANCELLED;
    }

    return invoice.save();
  }

  // ───────────────────────────────────────────────────────────
  // 5. Confirm cash payment  ← THÊM: cộng điểm luôn cho cash
  // ───────────────────────────────────────────────────────────

  async confirmCashPayment(
    invoiceId: string,
    staffId: string,
  ): Promise<IInvoice> {
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (
      invoice.invoice_status !== InvoiceStatus.DRAFT &&
      invoice.invoice_status !== InvoiceStatus.CANCELLED
    ) {
      throw new AppError(
        `Invoice status is "${invoice.invoice_status}", expected "draft" or "cancelled"`,
        400
      );
    }

    const session = await mongoose.startSession();

    try {
      let savedInvoice!: IInvoice;

      await session.withTransaction(async () => {
        invoice.invoice_status = InvoiceStatus.PAID;
        invoice.payment_method = PaymentMethod.CASH;
        invoice.staff_id = staffId as any;
        invoice.paid_at = new Date();
        invoice.is_verified = true;

        savedInvoice = await invoice.save({ session });

        // ── Cộng membership points & Cập nhật Appointment ───
        const earned = calcPoints(savedInvoice.total);
        await addMembershipPoints(savedInvoice.customer_id, earned, session);

        if (savedInvoice.appointment_id) {
          await Appointment.findByIdAndUpdate(
            savedInvoice.appointment_id,
            {
              $set: {
                booking_status: 'completed',
                completed_at: new Date(),
              },
            },
            { session }
          );
        }
        // ────────────────────────────────────────────────────
      });

      return savedInvoice;
    } finally {
      await session.endSession();
    }
  }

  // ───────────────────────────────────────────────────────────
  // 6. Get invoice detail
  // ───────────────────────────────────────────────────────────

  async getById(invoiceId: string): Promise<IInvoice> {
    const invoice = await Invoice.findById(invoiceId)
      .populate('appointment_id')
      .populate('customer_id', 'customer_code')
    // .populate('promotion_id', 'promotion_code');

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    return invoice;
  }

  // ───────────────────────────────────────────────────────────
  // 7. Get invoice list
  // ───────────────────────────────────────────────────────────

  async getList(query: {
    page?: number;
    limit?: number;
    customer_id?: string;
    status?: string;
  }) {
    const {
      page = 1,
      limit = 10,
      customer_id,
      status,
    } = query;

    const filter: FilterQuery<IInvoice> = {};

    if (customer_id) {
      filter.customer_id = customer_id;
    }

    if (status) {
      filter.invoice_status = status;
    }

    return (Invoice as any).paginate(filter, {
      page,
      limit,
      sort: {
        createdAt: -1,
      },
      populate: [
        'customer_id',
        'appointment_id',
      ],
    });
  }
}

export const invoiceService = new InvoiceService();
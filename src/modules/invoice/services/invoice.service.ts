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
import { Appointment } from '../../../models/appointment.model';
import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────
// PayOS Client
// ─────────────────────────────────────────────────────────────

const payosClient = new PayOS({
  clientId: env.PAYOS_CLIENT_ID,
  apiKey: env.PAYOS_API_KEY,
  checksumKey: env.PAYOS_CHECKSUM_KEY,
});

export class InvoiceService {
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
  // 2. Webhook
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
  // 4. Sync invoice status
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
  // 5. Confirm cash payment
  // ───────────────────────────────────────────────────────────

  async confirmCashPayment(
    invoiceId: string,
    staffId: string,
  ): Promise<IInvoice> {
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (invoice.invoice_status !== InvoiceStatus.DRAFT) {
      throw new AppError(
        `Invoice status is "${invoice.invoice_status}", expected "draft"`,
        400
      );
    }

    invoice.invoice_status = InvoiceStatus.PAID;
    invoice.payment_method = PaymentMethod.CASH;
    invoice.staff_id = staffId as any;
    invoice.paid_at = new Date();
    invoice.is_verified = true;

    return invoice.save();
  }

  // ───────────────────────────────────────────────────────────
  // 6. Get invoice detail
  // ───────────────────────────────────────────────────────────

  async getById(invoiceId: string): Promise<IInvoice> {
    const invoice = await Invoice.findById(invoiceId)
      .populate('appointment_id')
      .populate('customer_id', 'customer_code')
      .populate('promotion_id', 'promotion_code');

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
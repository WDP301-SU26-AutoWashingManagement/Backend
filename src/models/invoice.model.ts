import mongoose, { Document, Schema, Types } from 'mongoose';
import { applyPlugins } from './global/model.plugin';
import { generateCode } from './counter.model';

// ─── Enum ──────────────────────────────────────────────────────────────────────
export enum InvoiceStatus {
  DRAFT     = 'draft',
  PENDING   = 'pending',   // đã tạo link PayOS, chờ thanh toán
  PAID      = 'paid',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  BANK = 'bank',  // PayOS / chuyển khoản
  CASH = 'cash',
}

export interface IInvoice extends Document {
  appointment_id : Types.ObjectId;
  customer_id    : Types.ObjectId;
  staff_id       : Types.ObjectId | null;
  promotion_id       : Types.ObjectId | null;
  customer_voucher_id: Types.ObjectId | null;
  invoice_number: string;   // INV-00000001
  subtotal        : number;  // base price trước giảm giá & thuế
  discount_amount : number;
  tier_discount   : number;
  promotion_discount: number;
  tax_amount      : number;
  total           : number;
  invoice_status : InvoiceStatus;
  payment_method : PaymentMethod | null;
  /** Mã đơn hàng PayOS (số nguyên dương, unique) */
  order_code      : number | null;
  /** Link thanh toán trả về từ PayOS */
  checkout_url    : string | null;
  /** QR code PayOS */
  qr_code         : string | null;
  /** Transaction reference PayOS trả về khi paid */
  transaction_ref : string | null;
  /** Nội dung chuyển khoản (dùng cho cash hoặc bank thủ công) */
  transfer_content: string | null;
  /** Thời gian link hết hạn */
  expired_at      : Date | null;
  /** Thời gian thanh toán thành công */
  paid_at         : Date | null;
  vat_requested : boolean;
  tax_code      : string | null;
  is_verified: boolean;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    appointment_id: {
      type    : Schema.Types.ObjectId,
      ref     : 'Appointment',
      required: true,
      unique  : true,   // 1 appointment → 1 invoice
    },
    customer_id: {
      type    : Schema.Types.ObjectId,
      ref     : 'Customer',
      required: true,
    },
    staff_id: {
      type   : Schema.Types.ObjectId,
      ref    : 'Staff',
      default: null,
    },

    promotion_id: {
      type   : Schema.Types.ObjectId,
      ref    : 'Promotion',
      default: null,
    },
    customer_voucher_id: {
      type   : Schema.Types.ObjectId,
      ref    : 'CustomerVoucher',
      default: null,
    },

    invoice_number: {
      type  : String,
      unique: true,
    },

    // ── Tiền ───────────────────────────────────────────────────────────────────
    subtotal       : { type: Number, required: true, min: 0 },
    discount_amount: { type: Number, default: 0,     min: 0 },
    tier_discount  : { type: Number, default: 0,     min: 0 },
    promotion_discount: { type: Number, default: 0,     min: 0 },
    tax_amount     : { type: Number, default: 0,     min: 0 },
    total          : { type: Number, required: true, min: 0 },

    // ── Status ─────────────────────────────────────────────────────────────────
    invoice_status: {
      type    : String,
      enum    : Object.values(InvoiceStatus),
      default : InvoiceStatus.DRAFT,
      required: true,
    },
    payment_method: {
      type   : String,
      enum   : Object.values(PaymentMethod),
      default: null,
    },

    // ── PayOS ──────────────────────────────────────────────────────────────────
    order_code      : { type: Number, unique: true, sparse: true },
    checkout_url    : { type: String, default: null },
    qr_code         : { type: String, default: null },
    transaction_ref : { type: String, default: null },
    transfer_content: { type: String, default: null },
    expired_at      : { type: Date,   default: null },
    paid_at         : { type: Date,   default: null },

    // ── VAT ────────────────────────────────────────────────────────────────────
    vat_requested: { type: Boolean, default: false },
    tax_code     : { type: String,  default: null  },

    // ── Xác nhận ───────────────────────────────────────────────────────────────
    is_verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─── Plugins & Hooks ──────────────────────────────────────────────────────────
invoiceSchema.plugin(applyPlugins);

invoiceSchema.index({ customer_id: 1, invoice_status: 1 });

// Tự sinh invoice_number: INV-00000001
invoiceSchema.pre('validate', async function (next) {
  if (!this.isNew) return next();
  this.invoice_number = await generateCode('invoice_number', 'INV', 8);
  next();
});

// XOR validation: không được có cả promotion_id lẫn customer_voucher_id
invoiceSchema.pre('save', function (next) {
  if (this.promotion_id && this.customer_voucher_id) {
    return next(new Error('Invoice cannot have both promotion_id and customer_voucher_id'));
  }
  next();
});

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);

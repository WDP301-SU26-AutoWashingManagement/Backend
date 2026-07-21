import mongoose, { Document, Schema, Types } from 'mongoose';
import { applyPlugins } from './global/model.plugin';
import { generateCode } from './counter.model';


export enum BookingStatus {
  PENDING     = 'pending',
  CONFIRMED   = 'confirmed',
  ARRIVED     = 'arrived',
  CHECKED_IN  = 'checked_in',
  IN_PROGRESS = 'in_progress',
  WASHED      = 'washed',
  COMPLETED   = 'completed',
  COMPENSATED = 'compensated',
  CANCELLED   = 'cancelled',
}

export enum BookingSource {
  APP  = 'app',
  WEB  = 'web',
}

export interface IBookingReport {
  title       : string;
  fullname    : string;
  description : string | null;
  evidence    : string[];
  phone       : string | null;
  email       : string | null;
  isConfirm   : boolean;
  status      : 'pending' | 'accepted' | 'rejected';
  reject_reason?: string;
  reject_details?: IRejectForm | null;
  compensation: ICompensationForm | null;
}

export interface IRejectForm {
  reason: string;
  admin_signature: string;
  customer_signature: string;
  created_at: Date;
}

export interface ICompensationForm {
  branch_info: string;
  customer_info: {
    fullname: string;
    phone: string;
    email: string;
  };
  compensation_amount: number;
  transfer_image: string | null;
  qr_image?: string | null;
  admin_signature: string;
  customer_signature: string;
  customer_signature_confirm?: string | null;
  created_at: Date;
}

export interface IAppointment extends Document {
  branch_id   : Types.ObjectId;
  vehicle_id  : Types.ObjectId;
  customer_id : Types.ObjectId;
  appointment_code: string;
  booking_status : BookingStatus;
  scheduled_at   : Date;
  checkedin_at   : Date | null;
  started_at     : Date | null;
  completed_at   : Date | null;
  cancelled_at   : Date | null;
  earned_membership_point : number;
  earned_reward_point     : number;
  redeemed_reward_point   : number;
  booking_source      : BookingSource;
  cancellation_reason : string | null;
  promotion_id        : Types.ObjectId | null;
  report              : IBookingReport | null;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    branch_id: {
      type    : Schema.Types.ObjectId,
      ref     : 'Branch',
      required: true,
    },
    vehicle_id: {
      type    : Schema.Types.ObjectId,
      ref     : 'Vehicle',
      required: true,
    },
    customer_id: {
      type    : Schema.Types.ObjectId,
      ref     : 'Customer',
      required: true,
    },

    appointment_code: {
      type  : String,
      unique: true,
    },

    booking_status: {
      type    : String,
      enum    : Object.values(BookingStatus),
      default : BookingStatus.PENDING,
      required: true,
    },

    scheduled_at : { type: Date, required: true },
    checkedin_at : { type: Date, default: null },
    started_at   : { type: Date, default: null },
    completed_at : { type: Date, default: null },
    cancelled_at : { type: Date, default: null },

    earned_membership_point : { type: Number, default: 0, min: 0 },
    earned_reward_point     : { type: Number, default: 0, min: 0 },
    redeemed_reward_point   : { type: Number, default: 0, min: 0 },

    booking_source: {
      type    : String,
      enum    : Object.values(BookingSource),
      default : BookingSource.APP,
      required: true,
    },
    cancellation_reason: { type: String, default: null },
    promotion_id: {
      type: Schema.Types.ObjectId,
      ref: 'Promotion',
      default: null,
    },
  },
  { timestamps: true }
);

const compensationFormSchema = new Schema<ICompensationForm>({
  branch_info: { type: String, required: true },
  customer_info: {
    fullname: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
  },
  compensation_amount: { type: Number, required: true, min: 0 },
  transfer_image: { type: String, default: null },
  qr_image: { type: String, default: null },
  admin_signature: { type: String, required: true },
  customer_signature: { type: String, required: true },
  customer_signature_confirm: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
}, { _id: false });

const rejectFormSchema = new Schema<IRejectForm>({
  reason: { type: String, required: true },
  admin_signature: { type: String, required: true },
  customer_signature: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
}, { _id: false });

const bookingReportSchema = new Schema<IBookingReport>(
  {
    title: {
      type    : String,
      required: true,
      trim    : true,
    },
    fullname: {
      type    : String,
      required: true,
      trim    : true,
    },
    description: {
      type   : String,
      default: null,
      trim   : true,
    },
    evidence: {
      type   : [String],
      default: [],
    },
    phone: {
      type   : String,
      default: null,
      trim   : true,
    },
    email: {
      type   : String,
      default: null,
      trim   : true,
    },
    isConfirm: {
      type   : Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    reject_reason: {
      type: String,
      default: null
    },
    reject_details: {
      type: rejectFormSchema,
      default: null
    },
    compensation: {
      type: compensationFormSchema,
      default: null,
    },
  } as any,
  { _id: false },
);

appointmentSchema.add({
  report: {
    type   : bookingReportSchema,
    default: null,
  },
});

appointmentSchema.plugin(applyPlugins);

appointmentSchema.index({ customer_id: 1, booking_status: 1 });
appointmentSchema.index({ branch_id: 1, scheduled_at: 1 });

appointmentSchema.pre('validate', async function (next) {
  if (!this.isNew) return next();
  this.appointment_code = await generateCode('appointment_code', 'APPT', 8);
  next();
});

export const Appointment = mongoose.model<IAppointment>('Appointment', appointmentSchema);

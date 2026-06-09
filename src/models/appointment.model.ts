import mongoose, { Document, Schema, Types } from 'mongoose';
import { applyPlugins } from './global/model.plugin';
import { generateCode } from './counter.model';


export enum BookingStatus {
  PENDING    = 'pending',
  CONFIRMED  = 'confirmed',
  CHECKED_IN = 'checked_in',
  COMPLETED  = 'completed',
  CANCELLED  = 'cancelled',
}

export enum BookingSource {
  APP  = 'app',
  WEB  = 'web',
  WALK = 'walk_in',
}

export interface IAppointment extends Document {
  branch_id   : Types.ObjectId;
  vehicle_id  : Types.ObjectId;
  customer_id : Types.ObjectId;
  staff_id    : Types.ObjectId | null;
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
    staff_id: {
      type   : Schema.Types.ObjectId,
      ref    : 'Staff',
      default: null,
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
  },
  { timestamps: true }
);

appointmentSchema.plugin(applyPlugins);

appointmentSchema.index({ customer_id: 1, booking_status: 1 });
appointmentSchema.index({ branch_id: 1, scheduled_at: 1 });
appointmentSchema.index({ staff_id: 1, scheduled_at: 1 });

appointmentSchema.pre('validate', async function (next) {
  if (!this.isNew) return next();
  this.appointment_code = await generateCode('appointment_code', 'APPT', 8);
  next();
});

export const Appointment = mongoose.model<IAppointment>('Appointment', appointmentSchema);

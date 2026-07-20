import mongoose, { Document, Schema, Types } from 'mongoose';
import { applyPlugins } from './global/model.plugin';

export interface IAppointmentService extends Document {
  appointment_id     : Types.ObjectId;
  service_id         : Types.ObjectId;
  service_package_id : Types.ObjectId | null;
  price_snapshot    : number;
  duration_snapshot : number;
  is_completed      : boolean;
}

const appointmentServiceSchema = new Schema<IAppointmentService>(
  {
    appointment_id: {
      type    : Schema.Types.ObjectId,
      ref     : 'Appointment',
      required: true,
    },
    service_id: {
      type    : Schema.Types.ObjectId,
      ref     : 'Service',
      required: true,
    },
    service_package_id: {
      type   : Schema.Types.ObjectId,
      ref    : 'ServicePackage',
      default: null,
    },

    price_snapshot   : { type: Number, required: true, min: 0 },
    duration_snapshot: { type: Number, required: true, min: 0 },
    is_completed     : { type: Boolean, default: false },
  },
  { timestamps: false }
);

// ─── Composite PK ─────────────────────────────────────────────────────────────
// appointment_id + service_id + service_package_id phải unique cùng nhau
appointmentServiceSchema.index(
  { appointment_id: 1, service_id: 1, service_package_id: 1 },
  { unique: true }
);

appointmentServiceSchema.plugin(applyPlugins);

export const AppointmentService = mongoose.model<IAppointmentService>(
  'AppointmentService',
  appointmentServiceSchema
);

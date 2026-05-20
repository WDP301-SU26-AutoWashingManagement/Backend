import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled';

export interface IWashBooking extends Document {
  customer_id: mongoose.Types.ObjectId;
  vehicle_id: mongoose.Types.ObjectId;
  service_package_id: mongoose.Types.ObjectId;
  promotion_id?: mongoose.Types.ObjectId;
  booking_status: BookingStatus;
  scheduled_at: Date;
  checkedin_at?: Date;
  completed_at?: Date;
  cancelled_at?: Date;
  earned_membership_point: number;
  earned_reward_point: number;
  redeemed_reward_point: number;
  base_price: number;
  discount_amount: number;
  final_price: number;
  booking_source: 'app' | 'web' | 'admin';
  cancellation_reason?: string;
  created_at: Date;
  updated_at: Date;
}
const washBookingSchema = new Schema<IWashBooking>(
  {
    customer_id:             { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    vehicle_id:              { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    service_package_id:      { type: Schema.Types.ObjectId, ref: 'ServicePackage', required: true },
    promotion_id:            { type: Schema.Types.ObjectId, ref: 'Promotion', default: null },
    booking_status:          { type: String, enum: ['pending','confirmed','checked_in','in_progress','completed','cancelled'], default: 'pending' },
    scheduled_at:            { type: Date, required: true },
    checkedin_at:            { type: Date, default: null },
    completed_at:            { type: Date, default: null },
    cancelled_at:            { type: Date, default: null },
    earned_membership_point: { type: Number, default: 0 },
    earned_reward_point:     { type: Number, default: 0 },
    redeemed_reward_point:   { type: Number, default: 0 },
    base_price:              { type: Number, required: true, min: 0 },
    discount_amount:         { type: Number, default: 0 },
    final_price:             { type: Number, required: true, min: 0 },
    booking_source:          { type: String, enum: ['app','web','admin'], default: 'app' },
    cancellation_reason:     { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

washBookingSchema.index({ customer_id: 1, booking_status: 1 });
washBookingSchema.index({ scheduled_at: 1 });

washBookingSchema.plugin(mongoosePaginate);

export const WashBooking = mongoose.model<IWashBooking>('WashBooking', washBookingSchema);
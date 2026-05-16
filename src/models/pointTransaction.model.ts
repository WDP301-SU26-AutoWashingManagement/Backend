import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IPointTransaction extends Document {
  customer_id: mongoose.Types.ObjectId;
  booking_id?: mongoose.Types.ObjectId;
  stage_of_point: 'earned' | 'redeemed' | 'expired' | 'bonus';
  type_of_point: 'membership' | 'reward';
  changed_point: number;
  expired_at?: Date;
  note?: string;
  created_at: Date;
}
const pointTransactionSchema = new Schema<IPointTransaction>(
  {
    customer_id:    { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    booking_id:     { type: Schema.Types.ObjectId, ref: 'WashBooking', default: null },
    stage_of_point: { type: String, enum: ['earned','redeemed','expired','bonus'], required: true },
    type_of_point:  { type: String, enum: ['membership','reward'], required: true },
    changed_point:  { type: Number, required: true },
    expired_at:     { type: Date, default: null },
    note:           { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } },
);

pointTransactionSchema.index({ customer_id: 1, created_at: -1 });

pointTransactionSchema.plugin(mongoosePaginate);

export const PointTransaction = mongoose.model<IPointTransaction>('PointTransaction', pointTransactionSchema);
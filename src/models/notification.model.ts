import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface INotification extends Document {
  customer_id: mongoose.Types.ObjectId;
  channel: 'push' | 'email' | 'in_app';
  notification_type: string;
  notification_title: string;
  notification_body: string;
  is_read: boolean;
  notification_status: 'pending' | 'sent' | 'failed';
  sent_at?: Date;
  created_at: Date;
}
const notificationSchema = new Schema<INotification>(
  {
    customer_id:         { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    channel:             { type: String, enum: ['push','email','in_app'], required: true },
    notification_type:   { type: String, required: true },
    notification_title:  { type: String, required: true },
    notification_body:   { type: String, required: true },
    is_read:             { type: Boolean, default: false },
    notification_status: { type: String, enum: ['pending','sent','failed'], default: 'pending' },
    sent_at:             { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } },
);

notificationSchema.index({ customer_id: 1, is_read: 1 });

notificationSchema.plugin(mongoosePaginate);

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
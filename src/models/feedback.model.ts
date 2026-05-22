import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

// ERD: Feedback { feedback_id PK, customer_id FK → Customer,
//                 booking_id FK → WashBooking,
//                 rating, feedback_comment, created_at }

export interface IFeedback extends Document {
  customer_id: mongoose.Types.ObjectId;
  booking_id: mongoose.Types.ObjectId;
  rating: number;
  feedback_comment?: string;
  created_at: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    customer_id:      { type: Schema.Types.ObjectId, ref: 'Customer',    required: true },
    booking_id:       { type: Schema.Types.ObjectId, ref: 'WashBooking', required: true, unique: true },
    rating:           { type: Number, required: true, min: 1, max: 5 },
    feedback_comment: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } },
);

feedbackSchema.index({ customer_id: 1 });

feedbackSchema.plugin(mongoosePaginate);

export const Feedback = mongoose.model<IFeedback>('Feedback', feedbackSchema);

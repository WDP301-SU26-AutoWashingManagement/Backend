import mongoose, { Schema, Document } from 'mongoose';

export interface ICronLog extends Document {
  message: string;
  status: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

const CronLogSchema = new Schema(
  {
    message: { type: String, required: true },
    status: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export const CronLog = mongoose.model<ICronLog>('CronLog', CronLogSchema);

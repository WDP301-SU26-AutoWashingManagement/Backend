import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IAuditLog extends Document {
  admin_id: mongoose.Types.ObjectId;
  action: string;
  target_entities: string;
  target_id?: string;
  diff_information?: Record<string, unknown>;
  ip_address?: string;
  created_at: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    admin_id:         { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    action:           { type: String, required: true },
    target_entities:  { type: String, required: true },
    target_id:        { type: String, default: null },
    diff_information: { type: Schema.Types.Mixed, default: null },
    ip_address:       { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } },
);
auditLogSchema.index({ admin_id: 1, created_at: -1 });

auditLogSchema.plugin(mongoosePaginate);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

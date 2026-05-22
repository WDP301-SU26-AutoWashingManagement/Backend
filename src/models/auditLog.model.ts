import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

// ERD: AuditLog { audit_log_id PK, user_id FK → User,
//                 action, target_entities, target_id,
//                 diff_information, ip_address, created_at }

export interface IAuditLog extends Document {
  user_id: mongoose.Types.ObjectId;
  action: string;
  target_entities: string;
  target_id?: string;
  diff_information?: Record<string, unknown>;
  ip_address?: string;
  created_at: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    user_id:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action:           { type: String, required: true },
    target_entities:  { type: String, required: true },
    target_id:        { type: String, default: null },
    diff_information: { type: Schema.Types.Mixed, default: null },
    ip_address:       { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } },
);

auditLogSchema.index({ user_id: 1, created_at: -1 });

auditLogSchema.plugin(mongoosePaginate);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

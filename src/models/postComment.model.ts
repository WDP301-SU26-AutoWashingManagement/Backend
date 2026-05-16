import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IPostComment extends Document {
  post_id: mongoose.Types.ObjectId;
  customer_id?: mongoose.Types.ObjectId;
  admin_id?: mongoose.Types.ObjectId;
  parent_comment_id?: mongoose.Types.ObjectId;
  comment_body: string;
  ai_checked: boolean;
  ai_rejected_reason?: string;
  created_at: Date;
  updated_at: Date;
}

const postCommentSchema = new Schema<IPostComment>(
  {
    post_id:           { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    customer_id:       { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    admin_id:          { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    parent_comment_id: { type: Schema.Types.ObjectId, ref: 'PostComment', default: null },
    comment_body:      { type: String, required: true, trim: true },
    ai_checked:        { type: Boolean, default: false },
    ai_rejected_reason:{ type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

postCommentSchema.index({ post_id: 1, created_at: -1 });

postCommentSchema.plugin(mongoosePaginate);

export const PostComment = mongoose.model<IPostComment>('PostComment', postCommentSchema);
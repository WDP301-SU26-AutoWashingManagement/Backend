import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IPost extends Document {
  admin_author_id: mongoose.Types.ObjectId;
  post_title: string;
  post_body: string;
  post_type: 'blog' | 'promotion' | 'announcement';
  post_status: 'draft' | 'published' | 'archived';
  ai_checked: boolean;
  is_allowed_comment: boolean;
  created_at: Date;
  updated_at: Date;
}

const postSchema = new Schema<IPost>(
  {
    admin_author_id:    { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    post_title:         { type: String, required: true, trim: true },
    post_body:          { type: String, required: true },
    post_type:          { type: String, enum: ['blog','promotion','announcement'], default: 'blog' },
    post_status:        { type: String, enum: ['draft','published','archived'], default: 'draft' },
    ai_checked:         { type: Boolean, default: false },
    is_allowed_comment: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

postSchema.index({ post_status: 1, created_at: -1 });

postSchema.plugin(mongoosePaginate);

export const Post = mongoose.model<IPost>('Post', postSchema);
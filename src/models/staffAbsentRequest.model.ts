import mongoose, { Schema, Document, Types } from "mongoose";
import { applyPlugins } from "./global/model.plugin";
import { RequestStatus } from "@common/types/enum";

export interface IStaffAbsentRequest extends Document {
  staff_id: Types.ObjectId;
  reviewed_by?: Types.ObjectId;

  from_date: Date;
  to_date: Date;

  reason: string;
  reviewer_note: string;

  request_status: RequestStatus;
}

const staffAbsentRequestSchema = new Schema<IStaffAbsentRequest>(
  {
    staff_id: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },

    reviewed_by: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    from_date: {
      type: Date,
      required: true,
    },

    to_date: {
      type: Date,
      required: true,
    },

    reason: {
      type: String,
      required: true,
    },

    reviewer_note: {
        type: String,
        required: true,
        default: "",
    },

    request_status: {
      type: String,
      enum: Object.values(RequestStatus),
      default: RequestStatus.PENDING,
    },
  },
  {
    timestamps: true,
  }
);

staffAbsentRequestSchema.plugin(applyPlugins);
export const StaffAbsentRequest = mongoose.model("StaffAbsentRequest", staffAbsentRequestSchema);
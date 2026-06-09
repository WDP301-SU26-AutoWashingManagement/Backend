import mongoose, { Document, Schema, Types } from "mongoose";
import { applyPlugins } from "./global/model.plugin";


export interface ISchedule extends Document {
  branch_id: Types.ObjectId;
  assigned_staff: Types.ObjectId[];
  shift_date: Date;
  start_time: Date;
  end_time: Date;
  shift_status: string;
  max_staff: number;
  algorithm: string;
}

const scheduleSchema = new Schema<ISchedule>(
  {
    branch_id: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },

    assigned_staff: [
      {
        type: Schema.Types.ObjectId,
        ref: "Staff",
        default: [],
      },
    ],

    shift_date: {
      type: Date,
      required: true,
    },

    start_time: {
      type: Date,
      required: true,
    },

    end_time: {
      type: Date,
      required: true,
    },

    shift_status: {
      type: String,
      required: true,
    },

    max_staff: {
      type: Number,
      required: true,
    },

    algorithm: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

scheduleSchema.plugin(applyPlugins);

export const Schedule = mongoose.model<ISchedule>("Schedule", scheduleSchema);
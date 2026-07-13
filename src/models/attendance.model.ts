import mongoose, { Document, Schema, Types } from "mongoose";
import { applyPlugins } from "./global/model.plugin";

export enum AttendanceStatus {
  NOT_CHECKED = "not_checked",
  CHECKED_IN = "checked_in",
  CHECKED_OUT = "checked_out",
  ABSENT = "absent",
}

export interface IAttendance extends Document {
  schedule_id: Types.ObjectId;
  staff_id: Types.ObjectId;
  branch_id: Types.ObjectId;
  check_in_time: Date | null;
  check_out_time: Date | null;
  status: AttendanceStatus;
  note: string | null;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    schedule_id: {
      type: Schema.Types.ObjectId,
      ref: "Schedule",
      required: true,
    },

    staff_id: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },

    branch_id: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },

    check_in_time: {
      type: Date,
      default: null,
    },

    check_out_time: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(AttendanceStatus),
      default: AttendanceStatus.NOT_CHECKED,
    },

    note: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Một staff chỉ có duy nhất 1 bản ghi chấm công cho mỗi ca
attendanceSchema.index({ schedule_id: 1, staff_id: 1 }, { unique: true });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ branch_id: 1 });

attendanceSchema.plugin(applyPlugins);

export const Attendance = mongoose.model<IAttendance>("Attendance", attendanceSchema);
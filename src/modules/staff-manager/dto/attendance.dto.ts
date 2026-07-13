import { AttendanceStatus } from "../../../models/attendance.model";

/**
 * ==================== REQUEST DTOs ====================
 */

export interface ICheckInRequest {
  schedule_id: string;
}

export interface ICheckOutRequest {
  schedule_id: string;
}

/**
 * ==================== RESPONSE DTOs ====================
 */

export interface IAttendanceResponse {
  _id: string;
  schedule_id: string;
  staff_id: string;
  branch_id: string;
  check_in_time: Date | null;
  check_out_time: Date | null;
  status: AttendanceStatus;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICheckInResponse {
  attendance: IAttendanceResponse;
  message: string;
}

export interface ICheckOutResponse {
  attendance: IAttendanceResponse;
  message: string;
}

export interface IApiResponse<T> {
  success: boolean;
  code: number;
  message: string;
  data?: T;
  error?: string;
}
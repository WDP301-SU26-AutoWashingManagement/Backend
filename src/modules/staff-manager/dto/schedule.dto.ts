import { Types } from 'mongoose';

/**
 * ==================== REQUEST DTOs ====================
 */

export interface CreateScheduleDTO {
  branch_id: string;
  shift_date: Date;
  start_time: Date;
  end_time: Date;
  shift_status: string;
  max_staff: number;
  algorithm?: string;
  assigned_staff?: string[];
}

/**
 * Add staff to schedule request
 */
export interface IAddStaffToScheduleRequest {
  schedule_id: string;
  staff_id: string;
}

/**
 * Switch two staff in schedule request
 */
export interface ISwitchStaffRequest {
  schedule_id_1: string;
  staff_id_1: string;
  schedule_id_2: string;
  staff_id_2: string;
}

/**
 * Get total leave days request
 */
export interface IGetTotalLeaveDaysRequest {
  staff_id: string;
}

/**
 * ==================== RESPONSE DTOs ====================
 */

export interface IScheduleResponse {
  _id: string;
  branch_id: string;
  assigned_staff: string[];
  shift_date: Date;
  start_time: string;
  end_time: string;
  shift_status: string;
  max_staff: number;
  algorithm?: string;
  shift_minutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAddStaffToScheduleResponse {
  schedule: IScheduleResponse;
  message: string;
}

export interface ISwitchStaffResponse {
  schedule_1: IScheduleResponse;
  schedule_2: IScheduleResponse;
  message: string;
}

export interface ITotalLeaveDaysResponse {
  staff_id: string;
  staff_code: string;
  annual_leave_days: number;
  used_leave_days: number;
  available_leave_days: number;
}

export interface IApiResponse<T> {
  success: boolean;
  code: number;
  message: string;
  data?: T;
  error?: string;
}
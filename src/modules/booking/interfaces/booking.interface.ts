import { Types } from 'mongoose';
import { BookingSource, BookingStatus } from '../../../models/appointment.model';

// ─── Request Interfaces (DTOs vào service) ────────────────────────────────────

/**
 * Mỗi service item trong lúc tạo booking.
 * service_package_id là optional — customer có thể chọn service đơn lẻ
 * hoặc chọn qua package.
 */
export interface IBookingServiceItem {
  service_id       : string;
  service_package_id?: string;
}

/**
 * Payload tạo booking mới (POST /bookings).
 * customer_id được lấy từ JWT, không cho phép client tự truyền.
 */
export interface ICreateBooking {
  branch_id    : string;
  vehicle_id   : string;
  scheduled_at : string;         // ISO 8601 string, validate trước khi parse thành Date
  services     : IBookingServiceItem[];
  booking_source?: BookingSource;
}

/**
 * Query params cho GET /bookings (danh sách).
 * Customer chỉ thấy booking của mình; Staff/Admin thấy tất cả theo filter.
 */
export interface IGetBookingList {
  page?           : number;
  limit?          : number;
  branch_id?      : string;
  customer_id?    : string;
  staff_id?       : string;
  booking_status? : BookingStatus;
  from_date?      : string;
  to_date?        : string;
}

/**
 * Payload xác nhận booking (PATCH /bookings/:id/confirm).
 * Staff có thể gán staff_id ngay lúc confirm.
 */
export interface IConfirmBooking {
  staff_id?: string;
}

/**
 * Payload assign staff riêng (POST /bookings/:id/assign-staff).
 */
export interface IAssignStaff {
  staff_id: string;
}

/**
 * Payload huỷ booking (PATCH /bookings/:id/cancel).
 */
export interface ICancelBooking {
  cancellation_reason: string;
}

// ─── Response / Computed Interfaces ───────────────────────────────────────────

/**
 * Slot trống tại 1 branch (GET /branches/:id/available-slots).
 * Trả về mảng thời điểm có thể đặt (ISO string).
 */
export interface IAvailableSlot {
  scheduled_at   : string;   // ISO string của time slot
  available_bays : number;   // số bay còn trống tại thời điểm đó
}

export interface IAvailableSlotsQuery {
  date         : string;    // YYYY-MM-DD
  service_ids? : string[];  // để tính tổng duration (optional)
}

/**
 * Kết quả populate đầy đủ 1 booking (trả về client).
 * Dùng kiểu loose vì populate thay ObjectId → Document.
 */
export interface IBookingDetail {
  _id              : string;
  appointment_code : string;
  booking_status   : BookingStatus;
  booking_source   : BookingSource;
  scheduled_at     : Date;
  checkedin_at     : Date | null;
  started_at       : Date | null;
  completed_at     : Date | null;
  cancelled_at     : Date | null;
  cancellation_reason : string | null;
  earned_membership_point : number;
  branch           : unknown;   // populated Branch
  vehicle          : unknown;   // populated Vehicle
  customer         : unknown;   // populated Customer → User
  staff            : unknown;   // populated Staff → User | null
  services         : IBookingServiceDetail[];
}

export interface IBookingServiceDetail {
  _id               : string;
  service           : unknown;          // populated Service
  service_package   : unknown | null;   // populated ServicePackage | null
  price_snapshot    : number;
  duration_snapshot : number;
}

// ─── Internal / Helper ────────────────────────────────────────────────────────

/**
 * Thông tin snapshot của 1 service tại thời điểm tạo booking.
 * Service giải quyết giá & duration một lần duy nhất khi booking được tạo —
 * tránh sai lệch khi admin thay đổi giá sau này.
 */
export interface IServiceSnapshot {
  service_id         : Types.ObjectId;
  service_package_id : Types.ObjectId | null;
  price_snapshot     : number;
  duration_snapshot  : number;
}
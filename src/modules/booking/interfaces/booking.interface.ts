// booking.interface.ts

import { BookingStatus } from '../../../models/washBooking.model';

export interface ICreateBooking {
    vehicle_id: string;
    service_package_id: string;
    promotion_id?: string;
    scheduled_at: string;
    booking_source: 'app' | 'web' | 'admin';
}

export interface ICancelBooking {
    reason: string;
}

export interface IGetBookingList {
    page: number;
    limit: number;
    customer_id?: string;
    vehicle_id?: string;
    booking_status?: BookingStatus;
    scheduled_from?: string;
    scheduled_to?: string;
}

// Tất cả status mà updateStatus() có thể nhận — bao gồm cả 'confirmed' từ confirmBooking()
export interface IUpdateBookingStatus {
    status: BookingStatus;
}

export interface IFindByPlateNumber {
    plate_number: string;
}
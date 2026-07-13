import { BookingStatus } from '../../../models/appointment.model';

/**
 * Lean booking-status payload pushed over SSE.
 */
export interface BookingStatusUpdate {
    appointment_id: string;
    appointment_code: string;
    booking_status: BookingStatus;
    scheduled_at: string;
    branch_name: string | null;
    vehicle_plate: string | null;
}

export enum ActionType {
    PREPAIRING = 'PREPAIRING',
    WASHING = 'WASHING',
    DONE = 'DONE',
    ERROR = 'ERROR'
}
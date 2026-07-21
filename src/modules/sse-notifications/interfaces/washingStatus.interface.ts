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
    IDLE = 'IDLE',
    PRE_RINSE = 'PRE_RINSE',
    SCRUBBING = 'SCRUBBING',
    POST_RINSE = 'POST_RINSE',
    DRYING = 'DRYING',
    DONE = 'DONE',
    ERROR = 'ERROR'
}
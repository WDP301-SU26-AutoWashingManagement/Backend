import { RequestStatus } from '@common/types/enum';
import { Document, Types } from 'mongoose';

export interface IStaffAbsentRequest extends Document {
    staff_id: string;

    from_date: Date;
    to_date: Date;

    reason: string;

    request_status: RequestStatus;

    reviewed_by: string;
}
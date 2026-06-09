import { RequestStatus } from '@common/types/enum';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { IStaffAbsentRequest, StaffAbsentRequest } from '../../../models/staffAbsentRequest.model';

export class StaffAbsentRequestRepository extends BaseRepository<IStaffAbsentRequest> {
    constructor() {
        super(StaffAbsentRequest);
    }

    async findByStaffId(staffId: string) {
        return this.model.find({ staff_id: staffId }).sort({ createdAt: -1 }).exec();
    }

    async findPending() {
        return this.model.find({ request_status: 'pending' }).exec();
    }

    async findByStatus(status: string) {
        return this.model.find({ request_status: status }).exec();
    }

    async findStaffOff(from?: Date, to?: Date) {
        const filter: any = {
            request_status: RequestStatus.APPROVED,
        };

        if (from && to) {
            filter.from_date = { $lte: to };
            filter.to_date = { $gte: from };
        }

        return this.model.find(filter);
    }

    async isOverlapping(staffId: string, from: Date, to: Date) {
        return this.model.exists({
            staff_id: staffId,
            request_status: { $in: ['pending', 'approved'] },
            $or: [
                {
                    from_date: { $lte: to },
                    to_date: { $gte: from },
                },
            ],
        });
    }

    async findAbsentStaffByStaffId(staffId: string) {
        return this.model
            .find({
            staff_id: staffId,
            request_status: 'approved',
            })
            .sort({ from_date: -1 })
            .exec();
    }

}

export const staffAbsentRequestRepository = new StaffAbsentRequestRepository();
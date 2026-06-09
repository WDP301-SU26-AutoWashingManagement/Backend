import { StaffRole } from '@common/types/enum';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Staff, IStaff } from 'src/models/staff.model';

export class StaffRepository extends BaseRepository<IStaff> {
    constructor() {
        super(Staff);
    }

    async findByUserId(userId: string) {
        return this.model.findOne({ user_id: userId }).exec();
    }

    async findByRole(role: string) {
        return this.model.find({ role }).exec();
    }

    async findAllActive() {
        return this.model.find({ is_active: true }).exec();
    }

    async findManagersByBranch(branchId: string) {
        return this.model.find({
            branch_id: branchId,
            staff_type: StaffRole.MANAGER,
        }).exec();
    }

}

export const staffRepository = new StaffRepository();
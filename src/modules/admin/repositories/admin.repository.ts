import { BaseRepository } from '../../../common/repositories/base.repository';
import Admin, { IAdmin } from '../../../models/admin.model';

export class AdminRepository extends BaseRepository<IAdmin> {
	constructor() {
		super(Admin);
	}

	async findByEmailWithPassword(email: string): Promise<IAdmin | null> {
		return this.model.findOne({ email }).select('+password').exec();
	}
}

export const adminRepository = new AdminRepository();


import { BaseRepository } from '../../../common/repositories/base.repository';
import Customer, { ICustomer } from '../../../models/customer.model';
import Admin, { IAdmin } from '../../../models/admin.model';
export class AuthRepository extends BaseRepository<ICustomer> {
  constructor() {
    super(Customer);
  }

  async findByEmailWithPassword(email: string): Promise<ICustomer | null> {
    return this.model.findOne({ email }).select('+password').exec();
  }
}

export class AdminRepository extends BaseRepository<IAdmin> {
  constructor() {
    super(Admin);
  }

  async findByEmailWithPassword(email: string): Promise<IAdmin | null> {
    return this.model.findOne({ email }).select('+password').exec();
  }
}

export const authRepository = new AuthRepository();
export const adminRepository = new AdminRepository();
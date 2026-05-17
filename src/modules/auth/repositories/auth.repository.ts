import { BaseRepository } from '../../../common/repositories/base.repository';
import Customer, { ICustomer } from '../../../models/customer.model';

export class AuthRepository extends BaseRepository<ICustomer> {
  constructor() {
    super(Customer);
  }

  async findByEmailWithPassword(email: string): Promise<ICustomer | null> {
    return this.model.findOne({ email }).select('+password').exec();
  }
}

export const authRepository = new AuthRepository();
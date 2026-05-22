import { BaseRepository } from '../../../common/repositories/base.repository';
import { IUser, User } from 'src/models/user.model';
export class AuthRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    return this.model.findOne({ email }).select('+password').exec();
  }
}

export const authRepository = new AuthRepository();

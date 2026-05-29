import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { IUser , User} from '../../../models/user.model';
export class AuthRepository extends BaseRepository<IUser> {
  constructor(model: Model<IUser>) {
    super(model);
  }
  
  findByEmail(email: string) {
    return this.model.findOne({ email }).select('+password').exec();
  }

  findByIdWithPassword(id: string) {
    return this.model.findById(id).select('+password').exec();
  }
}

export const authRepository = new AuthRepository(User);
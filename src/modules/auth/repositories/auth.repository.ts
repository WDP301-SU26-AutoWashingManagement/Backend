import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { IUser, User } from '../../../models/user.model';

export class AuthRepository extends BaseRepository<IUser> {
  constructor(model: Model<IUser>) {
    super(model);
  }

  // READ — dùng rm (replica)
  findByEmail(email: string) {
    return this.rm.findOne({ email }).select('+password').exec();
  }

  findByIdWithPassword(id: string) {
    return this.rm.findById(id).select('+password').exec();
  }

  getAdminByBranch(branchId: string) {
    return this.rm.findOne({ branchId, role: 'ADMIN' }).select('email fullName');
  }

  // WRITE — dùng wm (primary)
  findOneAndUpdate(
    filter: Record<string, any>,
    update: Record<string, any>,
    options: Record<string, any> = {},
  ) {
    return this.wm.findOneAndUpdate(filter, update, {
      new: true,
      runValidators: true,
      ...options,
    });
  }
}

export const authRepository = new AuthRepository(User);
import { NotFoundError, BadRequestError } from '../../../common/utils/AppError';
import {
  findRoleDocByUserId,
  userRepository,
} from '../repositories/userProfile.repository';
import {
  IUpdateProfileData,
  IChangePasswordData,
  IUserProfileResponse,
} from '../interfaces/userProfile.interface';
import { UserRole } from '../../../common/types/enum';
import { User } from 'src/models/user.model';


export class UserProfileService {
  private readonly userRepo = userRepository;
  async getProfile(userId: string): Promise<IUserProfileResponse> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const roleDoc = await findRoleDocByUserId(userId, user.role as UserRole);

    return this.buildProfileResponse(user, roleDoc);
  }

  // ─── updateProfile ──────────────────────────────────────────────────────────
  async updateProfile(
    userId: string,
    data: IUpdateProfileData,
  ): Promise<IUserProfileResponse> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if ((data as any).file) {
      const file = (data as any).file;

      const base64 = file.buffer.toString('base64');

      data.avatar_url =
        `data:${file.mimetype};base64,${base64}`;

      delete (data as any).file;
    }

    if (data.phone) {
      const taken = await userRepository.isPhoneTaken(
        data.phone,
        userId,
      );

      if (taken) {
        throw new BadRequestError(
          'Số điện thoại đã được sử dụng! Vui lòng chọn số điện thoại khác',
        );
      }
    }

    await userRepository.updateById(userId, data);

    return this.getProfile(userId);
  }

  // ─── changePassword (all roles share same flow) ──────────────────────────────
  async changePassword(
    userId: string,
    data: IChangePasswordData,
  ): Promise<{ message: string }> {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) throw new NotFoundError('User not found');

    const isMatch = await user.comparePassword(data.old_password);
    if (!isMatch) throw new BadRequestError('Incorrect old password');

    user.password = data.new_password;
    await user.save(); // triggers bcrypt pre-save hook

    return { message: 'Password changed successfully' };
  }

  // ─── helpers ─────────────────────────────────────────────────────────────────
  private buildProfileResponse(user: any, roleDoc: any): IUserProfileResponse {
    const {
      password,
      __v,
      ...safeUser
    } = typeof user.toObject === 'function' ? user.toObject() : { ...user };

    const role_data = roleDoc
      ? (() => {
        const { __v, user_id, ...safeRole } =
          typeof roleDoc.toObject === 'function' ? roleDoc.toObject() : { ...roleDoc };
        return safeRole;
      })()
      : null;

    return { ...safeUser, role_data };
  }

  async resolveUserBranch(userId: string): Promise<string | undefined> {
    const user = await User.findById(userId).lean();
    return user?.branch_id ? user.branch_id.toString() : undefined;
  }
}

export const userProfileService = new UserProfileService()
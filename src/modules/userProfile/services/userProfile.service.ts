import { NotFoundError, BadRequestError } from '../../../common/utils/AppError';
import {
  userRepository,
  findRoleDocByUserId,
  updateRoleDoc,
} from '../repositories/userProfile.repository';
import {
  IUpdateProfileData,
  IChangePasswordData,
  IUserProfileResponse,
} from '../interfaces/userProfile.interface';
import { UserRole } from '@common/types';
import { MongoId }  from '../../../common/types';

// Fields that belong to the Customer role document (not User)
const CUSTOMER_ROLE_FIELDS = new Set(['has_online_access']);

export class UserProfileService {
  // ─── getProfile ─────────────────────────────────────────────────────────────
  static async getProfile(userId: MongoId): Promise<IUserProfileResponse> {
    const user = await userRepository.findById(userId.toString());
    if (!user) throw new NotFoundError('User not found');

    const roleDoc = await findRoleDocByUserId(userId, user.role as UserRole);

    return UserProfileService.buildProfileResponse(user, roleDoc);
  }

  // ─── updateProfile ──────────────────────────────────────────────────────────
  static async updateProfile(
    userId: MongoId,
    role: UserRole,
    data: IUpdateProfileData,
  ): Promise<IUserProfileResponse> {
    const user = await userRepository.findById(userId.toString());
    if (!user) throw new NotFoundError('User not found');

    if ((data as any).file) {
      const file = (data as any).file;

      const base64 = file.buffer.toString('base64');

      data.avatar_url =
        `data:${file.mimetype};base64,${base64}`;

      delete (data as any).file;
    }
    // Split payload: User fields vs role-specific fields
    const userFields: Record<string, unknown>     = {};
    const roleFields: Record<string, unknown>     = {};

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      if (role === 'customer' && CUSTOMER_ROLE_FIELDS.has(key)) {
        roleFields[key] = value;
      } else {
        userFields[key] = value;
      }
    }

    // Check phone uniqueness on User collection
    if (userFields.phone) {
      const taken = await userRepository.isPhoneTaken(userFields.phone as string, userId);
      if (taken) throw new BadRequestError('Phone number is already in use');
    }

    // Update User document
    if (Object.keys(userFields).length > 0) {
      await userRepository.updateById(userId.toString(), userFields);
    }

    // Update role document (only customer has extra fields here)
    if (Object.keys(roleFields).length > 0) {
      await updateRoleDoc(userId, role, roleFields);
    }

    // Return fresh profile
    return UserProfileService.getProfile(userId);
  }

  // ─── changePassword (all roles share same flow) ──────────────────────────────
  static async changePassword(
    userId: MongoId,
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
  private static buildProfileResponse(user: any, roleDoc: any): IUserProfileResponse {
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
}

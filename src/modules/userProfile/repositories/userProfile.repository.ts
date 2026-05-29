import { User, IUser } from '../../../models/user.model';
import { Customer, ICustomer } from '../../../models/customer.model';
import { Staff, IStaff } from '../../../models/staff.model';
import { Admin, IAdmin } from '../../../models/admin.model';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { UserRole } from '../../../common/types/enum';

// ─── User repository ──────────────────────────────────────────────────────────
export class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  async findByIdWithPassword(userId: string): Promise<IUser | null> {
    return this.model.findById(userId).select('+password').exec();
  }

  async isPhoneTaken(phone: string, excludeUserId: string): Promise<boolean> {
    const found = await this.model.findOne({ phone, _id: { $ne: excludeUserId } }).lean().exec();
    return !!found;
  }
}

// ─── Role repositories (findByUserId) ─────────────────────────────────────────
export class CustomerRoleRepository extends BaseRepository<ICustomer> {
  constructor() { super(Customer); }

  findByUserId(userId: string): Promise<ICustomer | null> {
    return this.model.findOne({ user_id: userId }).exec();
  }

  findByUserIdWithTier(userId: string): Promise<ICustomer | null> {
    return this.model
      .findOne({ user_id: userId })
      .populate('tier_id')
      .exec();
  }
  async findBookingWindowByUserId(userId: string): Promise<number | null> {
    const customer = await this.model
      .findOne({ user_id: userId })
      .populate('tier_id')
      .lean()
      .exec();

    const tier = customer?.tier_id as any;

    return tier?.booking_window_days ?? null;
  }
}

export class StaffRoleRepository extends BaseRepository<IStaff> {
  constructor() { 
    super(Staff); 
  }

  findByUserId(userId: string): Promise<IStaff | null> {
    return this.model.findOne({ user_id: userId }).exec();
  }
}

export class AdminRoleRepository extends BaseRepository<IAdmin> {
  constructor() { super(Admin); }

  findByUserId(userId: string): Promise<IAdmin | null> {
    return this.model.findOne({ user_id: userId }).exec();
  }
}

// ─── Singleton exports ────────────────────────────────────────────────────────
export const userRepository = new UserRepository();
export const customerRoleRepository = new CustomerRoleRepository();
export const staffRoleRepository = new StaffRoleRepository();
export const adminRoleRepository = new AdminRoleRepository();

export async function findRoleDocByUserId(
  userId: string,
  role: UserRole,
): Promise<ICustomer | IStaff  | IAdmin | null> {
  switch (role) {
    case 'customer': return customerRoleRepository.findByUserIdWithTier(userId);
    case 'staff': return staffRoleRepository.findByUserId(userId);
    case 'admin': return adminRoleRepository.findByUserId(userId);
    default: return null;
  }
}

export async function updateRoleDoc(
  userId: string,
  role: UserRole,
  data: Record<string, unknown>,
): Promise<void> {
  switch (role) {
    case 'customer':
      await customerRoleRepository.updateOne({ user_id: userId }, data);
      break;
    default:
      break;
  }
}


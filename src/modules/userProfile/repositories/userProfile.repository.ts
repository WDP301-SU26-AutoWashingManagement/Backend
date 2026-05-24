import { User, IUser } from '../../../models/user.model';
import { Customer, ICustomer } from '../../../models/customer.model';
import { Staff, IStaff } from '../../../models/staff.model';
import { Manager, IManager } from '../../../models/manager.model';
import { Admin, IAdmin } from '../../../models/admin.model';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { UserRole } from '@common/types';
import { MongoId } from '../../../common/types';

// ─── User repository ──────────────────────────────────────────────────────────
export class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  async findByIdWithPassword(userId: MongoId): Promise<IUser | null> {
    return this.model.findById(userId).select('+password').exec();
  }

  async isPhoneTaken(phone: string, excludeUserId: MongoId): Promise<boolean> {
    const found = await this.model.findOne({ phone, _id: { $ne: excludeUserId } }).lean().exec();
    return !!found;
  }
}

// ─── Role repositories (findByUserId) ─────────────────────────────────────────
export class CustomerRoleRepository extends BaseRepository<ICustomer> {
  constructor() { super(Customer); }

  findByUserId(userId: MongoId): Promise<ICustomer | null> {
    return this.model.findOne({ user_id: userId }).exec();
  }

  findByUserIdWithTier(userId: MongoId): Promise<ICustomer | null> {
    return this.model
      .findOne({ user_id: userId })
      .populate('tier_id')
      .exec();
  }
  async findBookingWindowByUserId(userId: MongoId): Promise<number | null> {
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
  constructor() { super(Staff); }

  findByUserId(userId: MongoId): Promise<IStaff | null> {
    return this.model.findOne({ user_id: userId }).exec();
  }
}

export class ManagerRoleRepository extends BaseRepository<IManager> {
  constructor() { super(Manager); }

  findByUserId(userId: MongoId): Promise<IManager | null> {
    return this.model.findOne({ user_id: userId }).exec();
  }
}

export class AdminRoleRepository extends BaseRepository<IAdmin> {
  constructor() { super(Admin); }

  findByUserId(userId: MongoId): Promise<IAdmin | null> {
    return this.model.findOne({ user_id: userId }).exec();
  }
}


const customerRoleRepo = new CustomerRoleRepository();
const staffRoleRepo = new StaffRoleRepository();
const managerRoleRepo = new ManagerRoleRepository();
const adminRoleRepo = new AdminRoleRepository();

export async function findRoleDocByUserId(
  userId: MongoId,
  role: UserRole,
): Promise<ICustomer | IStaff | IManager | IAdmin | null> {
  switch (role) {
    case 'customer': return customerRoleRepo.findByUserIdWithTier(userId);
    case 'staff': return staffRoleRepo.findByUserId(userId);
    case 'manager': return managerRoleRepo.findByUserId(userId);
    case 'admin': return adminRoleRepo.findByUserId(userId);
    default: return null;
  }
}

export async function updateRoleDoc(
  userId: MongoId,
  role: UserRole,
  data: Record<string, unknown>,
): Promise<void> {
  switch (role) {
    case 'customer':
      await customerRoleRepo.updateOne({ user_id: userId }, data);
      break;
    // staff / manager / admin have no updatable role fields at this endpoint
    default:
      break;
  }
}

// ─── Singleton exports ────────────────────────────────────────────────────────
export const userRepository = new UserRepository();
export const customerRoleRepository = new CustomerRoleRepository();
export const staffRoleRepository = new StaffRoleRepository();
export const managerRoleRepository = new ManagerRoleRepository();
export const adminRoleRepository = new AdminRoleRepository();
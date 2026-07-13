import { StaffRole } from '@common/types/enum';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Staff, IStaff } from '../../../models/staff.model';
import { IPaginatedStaffResponse, IStaffResponse, SortableStaffField } from '../dto/staff.dto';
import { Types } from 'mongoose';
import { IUser } from '../../../models/user.model';

const POPULATE_USER = 'email full_name avatar_url phone is_active';

export class StaffRepository extends BaseRepository<IStaff> {
  constructor() {
    super(Staff);
  }

  // ─── READ (replica) ────────────────────────────────────────────────────────

  findById = async (id: string) => {
    const result = await this.rm
      .findById(id)
      .populate('user_id', POPULATE_USER)
      .exec();
    console.log('[DEBUG] staff.user_id after populate:', JSON.stringify(result?.user_id));
    return result as any;
  };

  async findByUserId(userId: string) {
    return this.rm.findOne({ user_id: userId }).populate('user_id', POPULATE_USER).exec();
  }

  async findByRole(role: string) {
    return this.rm.find({ role }).populate('user_id', POPULATE_USER).exec();
  }

  async findAllActive() {
    return this.rm.find({ is_active: true }).populate('user_id', POPULATE_USER).exec();
  }

  async findManagersByBranch(branchId: string) {
    return this.rm
      .find({ branch_id: branchId, staff_type: StaffRole.MANAGER })
      .populate('user_id', POPULATE_USER)
      .exec();
  }

  async findByStaffCode(staffCode: string): Promise<IStaff | null> {
    return this.rm.findOne({ staff_code: staffCode }).populate('user_id', POPULATE_USER);
  }

  async findAll(
    filters: { staff_type?: StaffRole; branch_id?: string | Types.ObjectId; search?: string },
    pagination: { page: number; limit: number },
    sort: { field: SortableStaffField; order: 'asc' | 'desc' },
  ): Promise<IPaginatedStaffResponse> {
    const { staff_type, branch_id, search } = filters;
    const { page, limit } = pagination;

    const query: any = {};
    if (staff_type) query.staff_type = staff_type;
    if (branch_id && Types.ObjectId.isValid(branch_id))
      query.branch_id = new Types.ObjectId(branch_id);
    if (search) query.staff_code = { $regex: search, $options: 'i' };

    const skip = (page - 1) * limit;
    const sortObj: any = { [sort.field]: sort.order === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      this.rm.find(query).populate('user_id', POPULATE_USER).sort(sortObj).skip(skip).limit(limit).lean(),
      this.rm.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data: data.map((s) => this.mapToResponse(s)),
      pagination: { page, limit, total, total_pages: totalPages, has_next: page < totalPages, has_prev: page > 1 },
    };
  }

  async findAllWithSort(
    sort: { field: SortableStaffField; order: 'asc' | 'desc' },
    pagination: { page: number; limit: number },
  ): Promise<IPaginatedStaffResponse> {
    return this.findAll({}, pagination, sort);
  }

  async findByBranch(branchId: string | Types.ObjectId): Promise<IStaff[]> {
    if (!Types.ObjectId.isValid(branchId)) return [];
    return this.rm
      .find({ branch_id: new Types.ObjectId(branchId) })
      .populate('user_id', POPULATE_USER);
  }

  async countByType(staffType: StaffRole): Promise<number> {
    return this.rm.countDocuments({ staff_type: staffType });
  }

  async staffCodeExists(staffCode: string, excludeId?: string): Promise<boolean> {
    const query: any = { staff_code: staffCode };
    if (excludeId) query._id = { $ne: new Types.ObjectId(excludeId) };
    const count = await this.rm.countDocuments(query);
    return count > 0;
  }

  async getLeaveSummary(staffId: string | Types.ObjectId) {
    const staff = await this.findById(staffId.toString());
    if (!staff) return null;
    return {
      annual_leave_days:    staff.annual_leave_days,
      used_leave_days:      staff.used_leave_days,
      available_leave_days: staff.annual_leave_days - staff.used_leave_days,
    };
  }

  // ─── WRITE (primary) ───────────────────────────────────────────────────────

  updateById = async (id: string, data: any) => {
    return this.wm
      .findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate('user_id', POPULATE_USER)
      .exec() as any;
  };

  async updateUsedLeaveDays(staffId: string | Types.ObjectId, additionalDays: number): Promise<IStaff | null> {
    if (!Types.ObjectId.isValid(staffId)) return null;
    return this.wm
      .findByIdAndUpdate(staffId, { $inc: { used_leave_days: additionalDays } }, { new: true, runValidators: true })
      .populate('user_id', POPULATE_USER);
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private mapToResponse(staff: any): IStaffResponse {
    const user = staff.user_id as Partial<IUser>;
    return {
      _id:                staff._id.toString(),
      user_id:            user?._id?.toString() ?? staff.user_id?.toString(),
      branch_id:          staff.branch_id ? staff.branch_id.toString() : null,
      staff_code:         staff.staff_code,
      staff_type:         staff.staff_type,
      hire_date:          staff.hire_date,
      hour_per_week:      staff.hour_per_week,
      salary_coefficient: staff.salary_coefficient,
      annual_leave_days:  staff.annual_leave_days,
      used_leave_days:    staff.used_leave_days,
      createdAt:          staff.createdAt,
      updatedAt:          staff.updatedAt,
      email:              user?.email      ?? null,
      full_name:          user?.full_name  ?? null,
      avatar_url:         user?.avatar_url ?? null,
      phone:              user?.phone      ?? null,
      is_active:          user?.is_active  ?? null,
    };
  }
}

export const staffRepository = new StaffRepository();
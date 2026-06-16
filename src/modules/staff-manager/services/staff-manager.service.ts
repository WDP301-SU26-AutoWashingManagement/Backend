import { NotFoundError, BadRequestError, ForbiddenError } from '../../../common/utils/AppError';
import {
  staffAbsentRequestRepository,
} from '../repositories/staffAbsentRequest.repository';
import { staffRepository } from '../repositories/staff.repository';
import { IStaffAbsentRequest } from '../../../models/staffAbsentRequest.model';
import { RequestStatus, StaffRole } from '../../../common/types/enum';
import {Types} from 'mongoose';

export class StaffAbsentRequestService {
  private readonly requestRepo = staffAbsentRequestRepository;
  private readonly staffRepo = staffRepository;

  // ─── CREATE REQUEST ─────────────────────────────────────
  async createRequest(
    staffId: string,
    data: Partial<IStaffAbsentRequest>,
  ): Promise<IStaffAbsentRequest> {
    const staff = await this.staffRepo.findByUserId(staffId);

    if (!staff) throw new NotFoundError('Staff not found');

    const manager = await this.staffRepo.findManagersByBranch(staff.branch_id!.toString());
    const managerChosen = manager[0];

    const checkOverlap = await this.requestRepo.isOverlapping(staffId, data.from_date!, data.to_date!)
    if (checkOverlap){
      throw new BadRequestError("Đơn này đã tạo, vui lòng không tạo lại. Xin cảm ơn")
    }

    const request: IStaffAbsentRequest = await this.requestRepo.create({
      staff_id: new Types.ObjectId(staffId),
      from_date: data.from_date,
      to_date: data.to_date,
      reason: data.reason,
      request_status: RequestStatus.PENDING,
      reviewed_by: managerChosen?._id ?? null,
    });

    return request;
  }

  // ─── MANAGER REVIEW ─────────────────────────────────────
  async reviewRequest(
    managerId: string,
    requestId: string,
    status: 'approved' | 'rejected',
    note?: string,
  ): Promise<IStaffAbsentRequest> {
    const manager = await this.staffRepo.findByUserId(managerId)
    if (!manager) {
        throw new NotFoundError('Nhân viên không được tìm thấy');
    }

    if (manager.staff_type !== StaffRole.MANAGER) {
        throw new ForbiddenError('Chỉ có Quản lý (Manager) được cấp quyền');
    }
    
    const request = await this.requestRepo.findById(requestId);

    if (!request) throw new NotFoundError('Request not found');

    if (request.request_status !== 'pending') {
      throw new BadRequestError('Request already processed');
    }

    const staff = await this.staffRepo.findById(request.staff_id.toString())
    if (!staff){
      throw new NotFoundError('Không tìm thấy nhân viên');
    } 

    const totalLeaveDays =
      Math.ceil(
          (
              new Date(request.to_date).getTime() -
              new Date(request.from_date).getTime()
          ) / (1000 * 60 * 60 * 24)
      ) + 1;

    if (staff.used_leave_days + totalLeaveDays > staff.annual_leave_days) {
        throw new BadRequestError(
            'Số ngày nghỉ vượt quá số ngày phép còn lại'
        );
    }

    const updated = await this.requestRepo.updateById(requestId, {
      request_status: status,
      reviewed_by: managerId,
      reviewer_note: note || null,
    } as any);

    if (status === 'approved') {
        await this.staffRepo.updateById(staff?._id.toString(),
            {
                $inc: {
                    used_leave_days: totalLeaveDays
                },
            }
        );
    }

    return updated!;
  }

  // ─── GET STAFF REQUESTS ─────────────────────────────────
  async getStaffRequests(staffId: string) {
    return this.requestRepo.findMany({
      staff_id: staffId,
    });
  }

  // ─── GET ALL PENDING (FOR MANAGER) ──────────────────────
  async getPendingRequests(staffId: string) {
    const staff = await this.staffRepo.findByUserId(staffId)
    if (!staff) {
        throw new NotFoundError('Nhân viên không được tìm thấy');
    }

    if (staff.staff_type !== StaffRole.MANAGER) {
        throw new ForbiddenError('Chỉ có Quản lý (Manager) được cấp quyền');
    }
    return this.requestRepo.findMany({
      request_status: 'pending',
    });
  }

  async getStaffOff(
      managerId: string,
      from?: Date,
      to?: Date,
  ) {
      const manager =
          await this.staffRepo.findByUserId(managerId);

      if (!manager) {
          throw new NotFoundError(
              'Nhân viên không được tìm thấy'
          );
      }

      if (manager.staff_type !== StaffRole.MANAGER) {
          throw new ForbiddenError(
              'Chỉ có Quản lý (Manager) được cấp quyền'
          );
      }

      return this.requestRepo.findStaffOff(
          from,
          to,
      );
  }
}

export const staffAbsentRequestService = new StaffAbsentRequestService();
import { scheduleRepository } from '../repositories/schedule.repository';
import { staffRepository } from '../repositories/staff.repository';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../../common/utils/AppError';
import { StaffRole } from '../../../common/types/enum';
import { Types } from 'mongoose';
import { sendEmail } from '../../../common/utils/email.util';
import { authRepository } from '../../auth/repositories/auth.repository';
import {
  IAddStaffToScheduleResponse,
  ISwitchStaffResponse,
  IReplaceStaffResponse,
  ITotalLeaveDaysResponse,
  IScheduleResponse,
} from '../dto/schedule.dto';
import { EMAIL_TEMPLATE } from '@common/constants/emailTemplate';

export class ScheduleService {
    private readonly scheduleRepo = scheduleRepository;
    private readonly staffRepo = staffRepository;

    /**
     * Add staff to schedule
     * Người thực hiện: Manager
     * Điều kiện: Số lượng staff chưa đủ max_staff của lịch đó
     * Tự động: Gửi email thông báo cho staff
     */
    async addStaffToSchedule(
        managerId: string,
        scheduleId: string,
        staffId: string
    ): Promise<IAddStaffToScheduleResponse> {
        // Kiểm tra manager
        const manager = await this.staffRepo.findByUserId(managerId);
        if (!manager) {
            const user = await authRepository.findById(managerId);
            if (!user || (user.role !== 'admin' && user.role !== 'boss')) {
                throw new NotFoundError('Người dùng không có quyền quản lý lịch');
            }
        } else if (manager.staff_type === StaffRole.TECHNICAL) {
            throw new ForbiddenError('Staff technical không có quyền thêm nhân viên vào lịch');
        }

        // Kiểm tra schedule tồn tại
        const schedule = await this.scheduleRepo.findById(scheduleId);
        if (!schedule) {
        throw new NotFoundError('Lịch làm việc không tìm thấy');
        }

        // Kiểm tra staff tồn tại
        const staff = await this.staffRepo.findById(staffId);
        if (!staff) {
        throw new NotFoundError('Nhân viên không tìm thấy');
        }

        // Kiểm tra staff đã có trong lịch chưa
        const staffIdObj = new Types.ObjectId(staffId);
        if (schedule.assigned_staff.some((id) => id.equals(staffIdObj))) {
        throw new BadRequestError('Nhân viên đã có trong lịch làm việc này');
        }

        // Kiểm tra số lượng staff chưa đủ max_staff
        if (schedule.assigned_staff.length >= schedule.max_staff) {
        throw new BadRequestError(
            `Lịch đã đủ ${schedule.max_staff} nhân viên, không thể thêm nhân viên nữa`
        );
        }

        // Thêm staff vào schedule
        const updatedSchedule = await this.scheduleRepo.addStaff(scheduleId, staffId);
        if (!updatedSchedule) {
        throw new BadRequestError('Thêm nhân viên vào lịch thất bại');
        }

        // Gửi email thông báo cho staff
        try {
        // Lấy user info để gửi email
        const user = await this.getUserById(staff.user_id.toString());
        if (user && user.email) {
            const shiftDate = new Date(schedule.shift_date).toLocaleDateString('vi-VN');
            const emailContent = {
                to: user.email,
                subject: 'Thông báo phân công ca làm việc',
                template: 'schedule-assignment',
                data: {
                    staffName: user.name || 'Nhân viên',
                    shiftDate,
                    startTime: schedule.start_time,
                    endTime: schedule.end_time,
                    branchId: schedule.branch_id.toString(),
                },
            };
            await sendEmail(
                user.email,
                'Thông báo phân công ca làm việc',
                EMAIL_TEMPLATE.ASSIGNMENT_EMAIL({
                    staffName: emailContent.data.staffName,
                    shiftDate: emailContent.data.shiftDate,
                    startTime: emailContent.data.startTime,
                    endTime: emailContent.data.endTime,
                    branchName: emailContent.data.branchId,
                })
            ); 
        }
        } catch (error) {
        console.warn('Không thể gửi email thông báo:', error);
        // Không ném lỗi, vì thêm staff đã thành công
        }

        return {
        schedule: this.mapToScheduleResponse(updatedSchedule),
        message: `Thêm nhân viên vào lịch thành công. Email thông báo đã được gửi.`,
        };
    }

    /**
     * Switch two staff in different schedules
     * Người thực hiện: Manager
     * Tự động: Gửi email thông báo cho cả 2 staff
     */
    async switchStaff(
        managerId: string,
        scheduleId1: string,
        staffId1: string,
        scheduleId2: string,
        staffId2: string
    ): Promise<ISwitchStaffResponse> {
        // Kiểm tra manager
        const manager = await this.staffRepo.findByUserId(managerId);
        if (!manager) {
            const user = await authRepository.findById(managerId);
            if (!user || (user.role !== 'admin' && user.role !== 'boss')) {
                throw new NotFoundError('Người dùng không có quyền hoán đổi lịch');
            }
        } else if (manager.staff_type === StaffRole.TECHNICAL) {
            throw new ForbiddenError('Staff technical không có quyền thực hiện hoán đổi lịch');
        }

        // Kiểm tra schedule 1 tồn tại
        const schedule1 = await this.scheduleRepo.findById(scheduleId1);
        if (!schedule1) {
        throw new NotFoundError('Lịch làm việc thứ nhất không tìm thấy');
        }

        // Kiểm tra schedule 2 tồn tại
        const schedule2 = await this.scheduleRepo.findById(scheduleId2);
        if (!schedule2) {
        throw new NotFoundError('Lịch làm việc thứ hai không tìm thấy');
        }

        // Kiểm tra staff 1 tồn tại và có trong schedule 1
        const staff1 = await this.staffRepo.findById(staffId1);
        if (!staff1) {
        throw new NotFoundError('Nhân viên thứ nhất không tìm thấy');
        }

        const staffId1Obj = new Types.ObjectId(staffId1);
        if (!schedule1.assigned_staff.some((id) => id.equals(staffId1Obj))) {
        throw new BadRequestError('Nhân viên thứ nhất không có trong lịch làm việc thứ nhất');
        }

        // Kiểm tra staff 2 tồn tại và có trong schedule 2
        const staff2 = await this.staffRepo.findById(staffId2);
        if (!staff2) {
        throw new NotFoundError('Nhân viên thứ hai không tìm thấy');
        }

        const staffId2Obj = new Types.ObjectId(staffId2);
        if (!schedule2.assigned_staff.some((id) => id.equals(staffId2Obj))) {
        throw new BadRequestError('Nhân viên thứ hai không có trong lịch làm việc thứ hai');
        }

        // Kiểm tra điều kiện: nhân viên 2 chưa có trong lịch 1 và nhân viên 1 chưa có trong lịch 2
        if (schedule1.assigned_staff.some((id) => id.equals(staffId2Obj))) {
            throw new BadRequestError('Nhân viên thứ hai đã có mặt trong lịch làm việc thứ nhất (không thể đổi ca)');
        }
        if (schedule2.assigned_staff.some((id) => id.equals(staffId1Obj))) {
            throw new BadRequestError('Nhân viên thứ nhất đã có mặt trong lịch làm việc thứ hai (không thể đổi ca)');
        }

        // Thực hiện switch
        // Xóa staff 1 khỏi schedule 1
        let updatedSchedule1 = await this.scheduleRepo.removeStaff(scheduleId1, staffId1);
        if (!updatedSchedule1) {
        throw new BadRequestError('Thao tác switch thất bại');
        }

        // Xóa staff 2 khỏi schedule 2
        let updatedSchedule2 = await this.scheduleRepo.removeStaff(scheduleId2, staffId2);
        if (!updatedSchedule2) {
        throw new BadRequestError('Thao tác switch thất bại');
        }

        // Thêm staff 2 vào schedule 1
        updatedSchedule1 = await this.scheduleRepo.addStaff(scheduleId1, staffId2);
        if (!updatedSchedule1) {
        throw new BadRequestError('Thao tác switch thất bại');
        }

        // Thêm staff 1 vào schedule 2
        updatedSchedule2 = await this.scheduleRepo.addStaff(scheduleId2, staffId1);
        if (!updatedSchedule2) {
        throw new BadRequestError('Thao tác switch thất bại');
        }

        // Gửi email thông báo cho cả 2 staff
        try {
        // Email cho staff 1
        const user1 = await this.getUserById(staff1.user_id.toString());
        if (user1 && user1.email) {
            const shiftDate2 = new Date(schedule2.shift_date).toLocaleDateString('vi-VN');
            const emailContent1 = {
            to: user1.email,
            subject: 'Thông báo đổi ca làm việc',
            template: 'shift-switch',
            data: {
                staffName: user1.name || 'Nhân viên',
                oldShiftDate: new Date(schedule1.shift_date).toLocaleDateString('vi-VN'),
                oldStartTime: schedule1.start_time,
                oldEndTime: schedule1.end_time,
                newShiftDate: shiftDate2,
                newStartTime: schedule2.start_time,
                newEndTime: schedule2.end_time,
            },
            };
            await sendEmail(
                user1.email,
                'Thông báo thay đổi ca làm việc',
                EMAIL_TEMPLATE.SHIFT_SWITCH_EMAIL(emailContent1.data)
            );
        }

        // Email cho staff 2
        const user2 = await this.getUserById(staff2.user_id.toString());
        if (user2 && user2.email) {
            const shiftDate1 = new Date(schedule1.shift_date).toLocaleDateString('vi-VN');
            const emailContent2 = {
            to: user2.email,
            subject: 'Thông báo đổi ca làm việc',
            template: 'shift-switch',
            data: {
                staffName: user2.name || 'Nhân viên',
                oldShiftDate: new Date(schedule2.shift_date).toLocaleDateString('vi-VN'),
                oldStartTime: schedule2.start_time,
                oldEndTime: schedule2.end_time,
                newShiftDate: shiftDate1,
                newStartTime: schedule1.start_time,
                newEndTime: schedule1.end_time,
            },
            };
            await sendEmail(
                user1.email,
                'Thông báo thay đổi ca làm việc',
                EMAIL_TEMPLATE.SHIFT_SWITCH_EMAIL(emailContent2.data)
            );
        }
        } catch (error) {
        console.warn('Không thể gửi email thông báo:', error);
        // Không ném lỗi, vì switch đã thành công
        }

        return {
        schedule_1: this.mapToScheduleResponse(updatedSchedule1),
        schedule_2: this.mapToScheduleResponse(updatedSchedule2),
        message: 'Đổi ca làm việc thành công. Email thông báo đã được gửi cho cả 2 nhân viên.',
        };
    }

    /**
     * Replace one staff with another in a schedule
     * Người thực hiện: Manager
     * Tự động: Gửi email thông báo cho staff mới
     */
    async replaceStaff(
        managerId: string,
        scheduleId: string,
        oldStaffId: string,
        newStaffId: string
    ): Promise<IReplaceStaffResponse> {
        // Kiểm tra manager
        const manager = await this.staffRepo.findByUserId(managerId);
        if (!manager) {
            const user = await authRepository.findById(managerId);
            if (!user || (user.role !== 'admin' && user.role !== 'boss')) {
                throw new NotFoundError('Người dùng không có quyền quản lý lịch');
            }
        } else if (manager.staff_type === StaffRole.TECHNICAL) {
            throw new ForbiddenError('Staff technical không có quyền thay thế nhân viên');
        }

        // Kiểm tra schedule tồn tại
        const schedule = await this.scheduleRepo.findById(scheduleId);
        if (!schedule) {
            throw new NotFoundError('Lịch làm việc không tìm thấy');
        }

        // Kiểm tra staff cũ tồn tại và có trong schedule
        const oldStaff = await this.staffRepo.findById(oldStaffId);
        if (!oldStaff) {
            throw new NotFoundError('Nhân viên cũ không tìm thấy');
        }
        const oldStaffIdObj = new Types.ObjectId(oldStaffId);
        if (!schedule.assigned_staff.some((id) => id.equals(oldStaffIdObj))) {
            throw new BadRequestError('Nhân viên cũ không có trong lịch làm việc này');
        }

        // Kiểm tra staff mới tồn tại và CHƯA có trong schedule
        const newStaff = await this.staffRepo.findById(newStaffId);
        if (!newStaff) {
            throw new NotFoundError('Nhân viên mới không tìm thấy');
        }
        const newStaffIdObj = new Types.ObjectId(newStaffId);
        if (schedule.assigned_staff.some((id) => id.equals(newStaffIdObj))) {
            throw new BadRequestError('Nhân viên mới đã có trong lịch làm việc này');
        }

        // Xóa staff cũ
        let updatedSchedule = await this.scheduleRepo.removeStaff(scheduleId, oldStaffId);
        if (!updatedSchedule) {
            throw new BadRequestError('Thao tác xóa nhân viên cũ thất bại');
        }

        // Thêm staff mới
        updatedSchedule = await this.scheduleRepo.addStaff(scheduleId, newStaffId);
        if (!updatedSchedule) {
            // Rollback (cố gắng add lại nhân viên cũ)
            await this.scheduleRepo.addStaff(scheduleId, oldStaffId);
            throw new BadRequestError('Thao tác thêm nhân viên mới thất bại');
        }

        // Gửi email cho staff mới
        try {
            const userNew = await this.getUserById(newStaff.user_id.toString());
            if (userNew && userNew.email) {
                const shiftDate = new Date(schedule.shift_date).toLocaleDateString('vi-VN');
                const emailContent = {
                    to: userNew.email,
                    subject: 'Thông báo phân công ca làm việc',
                    template: 'schedule-assignment',
                    data: {
                        staffName: userNew.name || 'Nhân viên',
                        shiftDate,
                        startTime: schedule.start_time,
                        endTime: schedule.end_time,
                        branchId: schedule.branch_id.toString(),
                    },
                };
                await sendEmail(
                    userNew.email,
                    'Thông báo phân công ca làm việc (Thay thế)',
                    EMAIL_TEMPLATE.ASSIGNMENT_EMAIL({
                        staffName: emailContent.data.staffName,
                        shiftDate: emailContent.data.shiftDate,
                        startTime: emailContent.data.startTime,
                        endTime: emailContent.data.endTime,
                        branchName: emailContent.data.branchId,
                    })
                ); 
            }
        } catch (error) {
            console.warn('Không thể gửi email thông báo cho staff mới:', error);
        }

        return {
            schedule: this.mapToScheduleResponse(updatedSchedule),
            message: 'Thay thế nhân viên thành công. Email thông báo đã được gửi cho nhân viên mới.',
        };
    }

    /**
     * Update entire staff list for a schedule (via checkboxes)
     */
    async updateScheduleStaff(
        managerId: string,
        scheduleId: string,
        staffIds: string[]
    ): Promise<IReplaceStaffResponse> {
        // Kiểm tra manager
        const manager = await this.staffRepo.findByUserId(managerId);
        if (!manager) {
            const user = await authRepository.findById(managerId);
            if (!user || (user.role !== 'admin' && user.role !== 'boss')) {
                throw new NotFoundError('Người dùng không có quyền quản lý lịch');
            }
        } else if (manager.staff_type === StaffRole.TECHNICAL) {
            throw new ForbiddenError('Staff technical không có quyền cập nhật lịch');
        }

        // Kiểm tra schedule tồn tại
        const schedule = await this.scheduleRepo.findById(scheduleId);
        if (!schedule) {
            throw new NotFoundError('Lịch làm việc không tìm thấy');
        }

        if (staffIds.length > schedule.max_staff) {
            throw new BadRequestError(`Ca làm việc chỉ được phép tối đa ${schedule.max_staff} nhân viên`);
        }

        // Validate all new staffs exist
        for (const id of staffIds) {
            const st = await this.staffRepo.findById(id);
            if (!st) {
                throw new BadRequestError(`Nhân viên ${id} không tồn tại`);
            }
        }

        const oldStaffIds = schedule.assigned_staff.map(id => id.toString());
        const newlyAdded = staffIds.filter(id => !oldStaffIds.includes(id));

        const updatedSchedule = await this.scheduleRepo.updateStaffList(scheduleId, staffIds);
        if (!updatedSchedule) {
            throw new BadRequestError('Cập nhật nhân viên thất bại');
        }

        // Gửi email cho các staff mới được thêm vào ca
        for (const newStaffId of newlyAdded) {
            try {
                const staff = await this.staffRepo.findById(newStaffId);
                if (staff) {
                    const userNew = await this.getUserById(staff.user_id.toString());
                    if (userNew && userNew.email) {
                        const shiftDate = new Date(schedule.shift_date).toLocaleDateString('vi-VN');
                        await sendEmail(
                            userNew.email,
                            'Thông báo phân công ca làm việc',
                            EMAIL_TEMPLATE.ASSIGNMENT_EMAIL({
                                staffName: userNew.name || 'Nhân viên',
                                shiftDate: shiftDate,
                                startTime: schedule.start_time,
                                endTime: schedule.end_time,
                                branchName: schedule.branch_id.toString(),
                            })
                        );
                    }
                }
            } catch (error) {
                console.warn('Không thể gửi email thông báo cho staff mới:', error);
            }
        }

        return {
            schedule: this.mapToScheduleResponse(updatedSchedule),
            message: 'Cập nhật danh sách nhân viên thành công.',
        };
    }

    /**
     * Get total leave days for a staff
     * Người thực hiện: Manager
     * Trả về: Tổng ngày phép trong năm, đã sử dụng, còn lại
     */
    async getTotalLeaveDays(
        managerId: string,
        staffId: string
    ): Promise<ITotalLeaveDaysResponse> {
        // Kiểm tra manager
        const manager = await this.staffRepo.findByUserId(managerId);
        if (!manager) {
        throw new NotFoundError('Manager không tìm thấy');
        }

        if (manager.staff_type !== StaffRole.MANAGER) {
        throw new ForbiddenError('Chỉ Manager mới có quyền thực hiện hành động này');
        }

        // Kiểm tra staff tồn tại
        const staff = await this.staffRepo.findById(staffId);
        if (!staff) {
        throw new NotFoundError('Nhân viên không tìm thấy');
        }

        return {
        staff_id: staff._id.toString(),
        staff_code: staff.staff_code,
        annual_leave_days: staff.annual_leave_days,
        used_leave_days: staff.used_leave_days,
        available_leave_days: staff.annual_leave_days - staff.used_leave_days,
        };
    }

    /**
     * Map schedule document to response format
     */
    private mapToScheduleResponse(schedule: any): IScheduleResponse {
        return {
        _id: schedule._id.toString(),
        branch_id: schedule.branch_id.toString(),
        assigned_staff: schedule.assigned_staff.map((id: any) => id.toString()),
        shift_date: schedule.shift_date,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        shift_status: schedule.shift_status,
        max_staff: schedule.max_staff,
        algorithm: schedule.algorithm,
        shift_minutes: schedule.shift_minutes,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
        };
    }

    /**
     * Get user info by user_id
     */
    private async getUserById(userId: string): Promise<any> {
        return await authRepository.findById(userId);
    }
}

export const scheduleService = new ScheduleService();
import { FilterQuery, PaginateResult, Types } from 'mongoose';
import { appointmentRepository } from '../repositories/appointment.repository';
import { appointmentServiceRepository } from '../repositories/appointmentService.repository';

// Models
import { Appointment, BookingSource, BookingStatus, IAppointment } from '../../../models/appointment.model';
import { Branch } from '../../../models/branch.model';
import { Vehicle } from '../../../models/vehicle.model';
import { Customer } from '../../../models/customer.model';
import { Service } from '../../../models/service.model';
import { PackageService } from '../../../models/packageService.model';
import { Staff } from '../../../models/staff.model';

// Cross-module
import { scheduleRepository } from '../../staff-manager/repositories/schedule.repository';
import { customerRepository } from '../../customer/repositories/customer.repository';
import { invoiceService } from '../../invoice/services/invoice.service';

// Errors & types
import {
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
} from '../../../common/utils/AppError';
import {
    IAvailableSlot,
    IAvailableSlotsQuery,
    ICancelBooking,
    IConfirmBooking,
    ICreateBooking,
    IGetBookingList,
    IServiceSnapshot,
} from '../interfaces/booking.interface';
import { UserRole } from '../../../common/types/enum';
import { Promotion } from '../../../models/promotion.model';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Slot granularity (phút) — mỗi slot cách nhau 30 phút.
 * Điều chỉnh theo business rule thực tế.
 */
const SLOT_GRANULARITY_MINUTES = 30;

/** Điểm membership cộng cho mỗi 10.000 VNĐ thanh toán. */
const POINTS_PER_10K = 1;

// ─── Service Class ────────────────────────────────────────────────────────────

export class BookingService {
    private readonly appointmentRepo = appointmentRepository;
    private readonly appointmentServiceRepo = appointmentServiceRepository;

    // ─── 1. Available Slots ──────────────────────────────────────────────────

    /**
     * Tính các time slot trống của 1 branch trong 1 ngày.
     *
     * Algorithm:
     *  1. Lấy operating_time & bay_counts của branch.
     *  2. Tính số lượng booking active (PENDING/CONFIRMED/CHECKED_IN) trong từng slot.
     *  3. Slot có available_bays > 0 → trả ra.
     *
     * Nếu ngày là cuối tuần + branch có weekend hours → dùng weekend hours.
     */
    async getAvailableSlots(
        branchId: string,
        dto: IAvailableSlotsQuery,
    ): Promise<IAvailableSlot[]> {
        const branch = await Branch.findById(branchId).lean();
        if (!branch) throw new NotFoundError('Branch not found');
        if (!branch.is_active) throw new BadRequestError('Branch is currently inactive');

        const requestedDate = new Date(dto.date);
        if (isNaN(requestedDate.getTime())) {
            throw new BadRequestError('Invalid date format');
        }

        // Chặn đặt lịch quá khứ
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (requestedDate < today) {
            throw new BadRequestError('Cannot query slots for a past date');
        }

        const dayOfWeek = requestedDate.getDay(); // 0=Sun, 6=Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        const openStr = (isWeekend && branch.operating_time.weekend_open)
            ? branch.operating_time.weekend_open
            : branch.operating_time.default_open;
        const closeStr = (isWeekend && branch.operating_time.weekend_close)
            ? branch.operating_time.weekend_close
            : branch.operating_time.default_close;

        if (!openStr || !closeStr) throw new BadRequestError('Branch operating hours not configured');

        // Build day boundaries
        const [openH, openM] = openStr.split(':').map(Number);
        const [closeH, closeM] = closeStr.split(':').map(Number);

        const dayStart = new Date(requestedDate);
        dayStart.setHours(openH, openM, 0, 0);

        const dayEnd = new Date(requestedDate);
        dayEnd.setHours(closeH, closeM, 0, 0);

        // Fetch existing active bookings for the day once (1 DB call)
        const existingBookings = await this.appointmentRepo
            .findActiveByBranchAndDate(branchId, dayStart, dayEnd);

        // Map: slot ISO string → booking count
        const bookingCountMap = new Map<string, number>();
        for (const b of existingBookings) {
            const key = b.scheduled_at.toISOString();
            bookingCountMap.set(key, (bookingCountMap.get(key) ?? 0) + 1);
        }

        // Generate slots
        const slots: IAvailableSlot[] = [];
        const cursor = new Date(dayStart);
        const now = new Date();

        while (cursor < dayEnd) {
            const slotKey = cursor.toISOString();
            const bookedCount = bookingCountMap.get(slotKey) ?? 0;
            const availableBays = branch.bay_counts - bookedCount;

            // Bỏ qua slot đã qua (nếu hỏi ngày hôm nay)
            if (cursor > now && availableBays > 0) {
                slots.push({
                    scheduled_at: slotKey,
                    available_bays: availableBays,
                });
            }

            cursor.setMinutes(cursor.getMinutes() + SLOT_GRANULARITY_MINUTES);
        }

        return slots;
    }

    // ─── 2. Create Booking ───────────────────────────────────────────────────

    /**
     * Tạo Appointment + AppointmentService records.
     *
     * Business rules:
     *  - Vehicle phải thuộc customer.
     *  - scheduled_at phải nằm trong booking_window_days của tier customer.
     *  - scheduled_at phải là tương lai.
     *  - Branch phải active và còn bay trống tại slot đó.
     *  - Customer không được đặt trùng slot.
     *  - Mỗi service_id phải tồn tại và active.
     *  - Nếu có service_package_id, package phải chứa service đó.
     *  - Price & duration được snapshot tại thời điểm booking.
     */
    async createBooking(
        customerId: string,  // customer._id (ObjectId string) — lấy từ JWT + lookup
        userId: string,  // user._id — để lookup customer
        dto: ICreateBooking,
    ): Promise<IAppointment> {

        // ── Resolve customer record ──
        const customer = await customerRepository.findOne({ user_id: new Types.ObjectId(userId) });
        if (!customer) throw new NotFoundError('Customer profile not found');

        // Ghi đè customerId từ record thực, tránh client giả mạo
        const resolvedCustomerId = (customer._id as Types.ObjectId).toString();

        // ── Validate branch ──
        const branch = await Branch.findById(dto.branch_id).lean();
        if (!branch) throw new NotFoundError('Branch not found');
        if (!branch.is_active) throw new BadRequestError('Branch is currently inactive');

        // ── Validate vehicle ownership ──
        const vehicle = await Vehicle.findById(dto.vehicle_id).lean();
        if (!vehicle) throw new NotFoundError('Vehicle not found');
        if (vehicle.customer_id.toString() !== resolvedCustomerId) {
            throw new ForbiddenError('Vehicle does not belong to this customer');
        }

        // ── Validate scheduled_at ──
        const scheduledAt = new Date(dto.scheduled_at);
        if (isNaN(scheduledAt.getTime())) {
            throw new BadRequestError('Invalid scheduled_at date');
        }
        if (scheduledAt <= new Date()) {
            throw new BadRequestError('scheduled_at must be in the future');
        }

        // Validate booking window theo tier
        const tier = await customer.populate('tier_id');
        const tierConfig = (customer as any).tier_id;
        if (tierConfig?.booking_window_days) {
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + tierConfig.booking_window_days);
            if (scheduledAt > maxDate) {
                throw new BadRequestError(
                    `Your tier only allows booking up to ${tierConfig.booking_window_days} days in advance`,
                );
            }
        }

        // ── Validate no duplicate slot for this vehicle ──
        const hasDuplicate = await this.appointmentRepo.hasOverlappingBooking(
            dto.vehicle_id, scheduledAt,
        );
        if (hasDuplicate) {
            throw new ConflictError('Phương tiện này đã được đặt lịch vào khung giờ này');
        }

        // ── Validate branch bay availability ──
        const slotEnd = new Date(scheduledAt);
        slotEnd.setMinutes(slotEnd.getMinutes() + SLOT_GRANULARITY_MINUTES);

        const activeCount = await this.appointmentRepo.countActiveInWindow(
            dto.branch_id, scheduledAt, slotEnd,
        );
        if (activeCount >= branch.bay_counts) {
            throw new ConflictError('No available bays at this time slot. Please choose another time.');
        }

        // ── Validate & snapshot services ──
        const serviceSnapshots = await this.resolveServiceSnapshots(dto.services);

        // ── Create Appointment (PENDING) ──
        const appointment = await this.appointmentRepo.create({
            branch_id: new Types.ObjectId(dto.branch_id),
            vehicle_id: new Types.ObjectId(dto.vehicle_id),
            customer_id: new Types.ObjectId(resolvedCustomerId),
            booking_status: BookingStatus.PENDING,
            booking_source: dto.booking_source ?? BookingSource.APP,
            scheduled_at: scheduledAt,
            checkedin_at: null,
            started_at: null,
            completed_at: null,
            cancelled_at: null,
            earned_membership_point: 0,
            earned_reward_point: 0,
            redeemed_reward_point: 0,
            cancellation_reason: null,
            promotion_id: dto.promotion_id ? new Types.ObjectId(dto.promotion_id) : null,
        });

        // ── Create AppointmentService line-items ──
        await this.appointmentServiceRepo.insertMany(
            serviceSnapshots.map(s => ({
                appointment_id: appointment._id,
                service_id: s.service_id,
                service_package_id: s.service_package_id,
                price_snapshot: s.price_snapshot,
                duration_snapshot: s.duration_snapshot,
            })),
        );

        // Note: Invoice is now deferred until WASHED as requested by the user,
        // so we don't create it here. The promotion_id is saved in the Appointment
        // document itself so it can be viewed in the frontend during PENDING.

        return this.appointmentRepo.findByIdPopulated(
            (appointment._id as Types.ObjectId).toString(),
        ) as Promise<IAppointment>;
    }

    // ─── 3. Get List ─────────────────────────────────────────────────────────

    async getBookingList(
        dto: IGetBookingList & { time_slot?: string },
        requesterId: string,
        requesterRole: string,
    ): Promise<PaginateResult<any>> {
        const { page = 1, limit = 10, from_date, to_date, time_slot, ...rest } = dto;

        const filter: FilterQuery<IAppointment> = {};

        // Customer chỉ thấy booking của mình
        if (requesterRole === UserRole.CUSTOMER) {
            const customer = await customerRepository.findOne({
                user_id: new Types.ObjectId(requesterId),
            });
            if (!customer) throw new NotFoundError('Customer profile not found');
            filter.customer_id = customer._id;
        } else {
            if (rest.customer_id) filter.customer_id = new Types.ObjectId(rest.customer_id);

            // BẮT BUỘC lọc branch_id đối với STAFF và ADMIN
            if (requesterRole === UserRole.STAFF || requesterRole === UserRole.ADMIN) {
                const { User } = require('../../../models/user.model');
                const user = await User.findById(requesterId);
                if (user && user.branch_id) {
                    filter.branch_id = user.branch_id;
                } else if (rest.branch_id) {
                    filter.branch_id = new Types.ObjectId(rest.branch_id);
                }
            } else {
                // BOSS có thể lọc tự do
                if (rest.branch_id) filter.branch_id = new Types.ObjectId(rest.branch_id);
            }
        }

        if (rest.booking_status) {
            if (typeof rest.booking_status === 'string' && rest.booking_status.includes(',')) {
                filter.booking_status = { $in: rest.booking_status.split(',') };
            } else if (Array.isArray(rest.booking_status)) {
                filter.booking_status = { $in: rest.booking_status };
            } else {
                filter.booking_status = rest.booking_status;
            }
        }

        if (from_date || to_date) {
            filter.scheduled_at = {};
            if (from_date) filter.scheduled_at.$gte = new Date(from_date);
            if (to_date) filter.scheduled_at.$lte = new Date(to_date);
        }

        if (time_slot) {
            const [h, m] = time_slot.split(':').map(Number);
            filter.$expr = {
                $and: [
                    { $eq: [{ $hour: { date: "$scheduled_at", timezone: "+07:00" } }, h] },
                    { $eq: [{ $minute: { date: "$scheduled_at", timezone: "+07:00" } }, m] }
                ]
            };
        }

        const result = await this.appointmentRepo.paginateList(filter, { page, limit });

        const appointmentIds = result.docs.map(doc => doc._id);
        const services = await this.appointmentServiceRepo.findByAppointmentIds(appointmentIds);

        // Import Invoice
        const { Invoice } = require('../../../models/invoice.model');
        const invoices = await Invoice.find({ appointment_id: { $in: appointmentIds } }).lean();

        // Compute preview discounts
        const docsWithServices = await Promise.all(result.docs.map(async (doc) => {
            const docObj = doc.toObject ? doc.toObject() : doc;
            const docServices = services.filter(s => s.appointment_id.toString() === doc._id.toString());

            const base_price = docServices.reduce((sum, s) => sum + s.price_snapshot, 0);

            // Tìm hoá đơn tương ứng
            const invoice = invoices.find((inv: any) => inv.appointment_id.toString() === doc._id.toString());

            let final_price = invoice ? invoice.total : base_price;
            let discount_amount = invoice ? invoice.discount_amount : undefined;
            
            let applied_tier_discount = invoice?.tier_discount;
            let applied_promotion_discount = invoice?.promotion_discount;

            if (invoice && (applied_tier_discount === undefined || applied_promotion_discount === undefined)) {
                // Backward compatibility for old invoices without tier_discount/promotion_discount fields
                try {
                    if (invoice.promotion_id) {
                        const promotion = await Promotion.findById(invoice.promotion_id).lean();
                        if (promotion && promotion.type === 'discount') {
                            if (promotion.discount_percentage) {
                                const base = invoice.subtotal || base_price;
                                const maxCap = promotion.discount_amount || base;
                                const y = promotion.discount_percentage / 100;
                                
                                // Solve algebraically for tier_discount (x):
                                // D = tier_discount + promotion_discount
                                // Assume it didn't hit max cap: promotion_discount = (base - tier_discount) * y
                                // D = tier_discount + (base - tier_discount) * y
                                // D = tier_discount * (1 - y) + base * y
                                // tier_discount = (D - base * y) / (1 - y)
                                
                                const D = invoice.discount_amount;
                                let guessed_tier = Math.round((D - base * y) / (1 - y));
                                
                                // Check if it actually hit max cap:
                                if (guessed_tier < 0 || (base - guessed_tier) * y > maxCap) {
                                    // It hit max cap.
                                    applied_promotion_discount = maxCap;
                                    guessed_tier = D - maxCap;
                                } else {
                                    applied_promotion_discount = Math.round((base - guessed_tier) * y);
                                }

                                // Math already resolved applied_promotion_discount above
                            } else {
                                applied_promotion_discount = promotion.discount_amount || 0;
                            }
                        } else {
                            applied_promotion_discount = 0;
                        }
                        applied_tier_discount = Math.max(0, invoice.discount_amount - applied_promotion_discount);
                    } else {
                        applied_tier_discount = invoice.discount_amount;
                        applied_promotion_discount = 0;
                    }
                } catch(e) {
                    applied_tier_discount = invoice.discount_amount;
                    applied_promotion_discount = 0;
                }
            }

            if (!invoice && docObj.promotion_id) {
                try {
                    const customer = doc.customer_id as any; // populated customer
                    const tier_discount_pct = customer?.tier_id?.discount_percentage || 0;
                    const tier_discount = Math.round((base_price * tier_discount_pct) / 100);
                    
                    const price_after_tier = base_price - tier_discount;
                    
                    let promotion_discount = 0;
                    const promotion = await Promotion.findById(docObj.promotion_id).lean();
                    if (promotion && promotion.is_active && base_price >= (promotion.min_order_amount || 0)) {
                        if (promotion.type === 'discount') {
                            if (promotion.discount_percentage) {
                                const calculated = (price_after_tier * promotion.discount_percentage) / 100;
                                promotion_discount = promotion.discount_amount 
                                    ? Math.min(calculated, promotion.discount_amount)
                                    : calculated;
                            } else if (promotion.discount_amount) {
                                promotion_discount = Math.min(price_after_tier, promotion.discount_amount);
                            }
                        }
                    }
                    promotion_discount = Math.round(promotion_discount);
                    discount_amount = tier_discount + promotion_discount;
                    final_price = Math.max(0, base_price - discount_amount);
                    applied_tier_discount = tier_discount;
                    applied_promotion_discount = promotion_discount;
                } catch (err) {
                    console.error('Failed to preview discount:', err);
                }
            } else if (!invoice) {
                // Just tier discount preview
                const customer = doc.customer_id as any;
                const tier_discount_pct = customer?.tier_id?.discount_percentage || 0;
                applied_tier_discount = Math.round((base_price * tier_discount_pct) / 100);
                applied_promotion_discount = 0;
            }

            const mainPackage = docServices.find(s => s.service_package_id);
            const mainService = docServices[0];

            return {
                ...docObj,
                services: docServices,
                base_price,
                final_price,
                discount_amount,
                applied_tier_discount,
                applied_promotion_discount,
                // frontend expects service_package_id as object for package name
                service_package_id: mainPackage ? mainPackage.service_package_id : (mainService ? mainService.service_id : null)
            };
        }));

        return {
            ...result,
            docs: docsWithServices
        };
    }

    // ─── 4. Get By ID ────────────────────────────────────────────────────────

    async getBookingById(
        appointmentId: string,
        requesterId: string,
        requesterRole: string,
    ): Promise<{ appointment: IAppointment; services: unknown[] }> {
        const appointment = await this.appointmentRepo.findByIdPopulated(appointmentId) as IAppointment;
        if (!appointment) throw new NotFoundError('Booking not found');

        // Customer chỉ thấy booking của chính mình
        if (requesterRole === UserRole.CUSTOMER) {
            const customer = await customerRepository.findOne({
                user_id: new Types.ObjectId(requesterId),
            });
            if (!customer) throw new NotFoundError('Customer profile not found');
            if ((appointment?.customer_id).toString() !== (customer._id as Types.ObjectId).toString()) {
                throw new ForbiddenError('You are not allowed to view this booking');
            }
        }

        const services = await this.appointmentServiceRepo.findByAppointmentId(appointmentId);

        // Compute final_price similarly
        const { Invoice } = require('../../../models/invoice.model');
        const invoice = await Invoice.findOne({ appointment_id: appointmentId }).lean();

        const base_price = services.reduce((sum, s: any) => sum + s.price_snapshot, 0);
        let final_price = invoice ? invoice.total : base_price;
        let discount_amount = invoice ? invoice.discount_amount : undefined;

        let applied_tier_discount = invoice?.tier_discount;
        let applied_promotion_discount = invoice?.promotion_discount;

        if (invoice && (applied_tier_discount === undefined || applied_promotion_discount === undefined)) {
            // Backward compatibility
            try {
                if (invoice.promotion_id) {
                    const promotion = await Promotion.findById(invoice.promotion_id).lean();
                    if (promotion && promotion.type === 'discount') {
                        if (promotion.discount_percentage) {
                            const base = invoice.subtotal || base_price;
                            const maxCap = promotion.discount_amount || base;
                            const y = promotion.discount_percentage / 100;
                            
                            const D = invoice.discount_amount;
                            let guessed_tier = Math.round((D - base * y) / (1 - y));
                            
                            if (guessed_tier < 0 || (base - guessed_tier) * y > maxCap) {
                                applied_promotion_discount = maxCap;
                                guessed_tier = D - maxCap;
                            } else {
                                applied_promotion_discount = Math.round((base - guessed_tier) * y);
                            }
                        } else {
                            applied_promotion_discount = promotion.discount_amount || 0;
                        }
                    } else {
                        applied_promotion_discount = 0;
                    }
                    applied_tier_discount = Math.max(0, invoice.discount_amount - applied_promotion_discount);
                } else {
                    applied_tier_discount = invoice.discount_amount;
                    applied_promotion_discount = 0;
                }
            } catch(e) {
                applied_tier_discount = invoice.discount_amount;
                applied_promotion_discount = 0;
            }
        }

        if (!invoice && appointment.promotion_id) {
            try {
                const customer = appointment.customer_id as any; // populated customer
                const tier_discount_pct = customer?.tier_id?.discount_percentage || 0;
                const tier_discount = Math.round((base_price * tier_discount_pct) / 100);
                
                const price_after_tier = base_price - tier_discount;
                
                let promotion_discount = 0;
                const promotion = await Promotion.findById(appointment.promotion_id).lean();
                if (promotion && promotion.is_active && base_price >= (promotion.min_order_amount || 0)) {
                    if (promotion.type === 'discount') {
                        if (promotion.discount_percentage) {
                            const calculated = (price_after_tier * promotion.discount_percentage) / 100;
                            promotion_discount = promotion.discount_amount 
                                ? Math.min(calculated, promotion.discount_amount)
                                : calculated;
                        } else if (promotion.discount_amount) {
                            promotion_discount = Math.min(price_after_tier, promotion.discount_amount);
                        }
                    }
                }
                promotion_discount = Math.round(promotion_discount);
                discount_amount = tier_discount + promotion_discount;
                final_price = Math.max(0, base_price - discount_amount);
                applied_tier_discount = tier_discount;
                applied_promotion_discount = promotion_discount;
            } catch (err) {
                console.error('Failed to preview discount in getBookingById:', err);
            }
        } else if (!invoice) {
            const customer = appointment.customer_id as any;
            const tier_discount_pct = customer?.tier_id?.discount_percentage || 0;
            applied_tier_discount = Math.round((base_price * tier_discount_pct) / 100);
            applied_promotion_discount = 0;
        }

        const appointmentObj = appointment.toObject ? appointment.toObject() : appointment;
        const resultAppt = {
            ...appointmentObj,
            base_price,
            final_price,
            discount_amount,
            applied_tier_discount,
            applied_promotion_discount
        };

        return { appointment: resultAppt as any, services };
    }

    // ─── 5. Confirm Booking ──────────────────────────────────────────────────

    /**
     * Staff/Manager xác nhận booking.
     * Chỉ PENDING → CONFIRMED, không skip state.
     */
    async confirmBooking(
        appointmentId: string,
        dto: IConfirmBooking,
    ): Promise<IAppointment> {
        const appointment = await this.appointmentRepo.findById(appointmentId);
        if (!appointment) throw new NotFoundError('Booking not found');

        if (appointment.booking_status !== BookingStatus.PENDING) {
            throw new BadRequestError(
                `Cannot confirm a booking with status "${appointment.booking_status}"`,
            );
        }

        const updated = await this.appointmentRepo.updateById(appointmentId, {
            booking_status: BookingStatus.CONFIRMED,
        });
        if (!updated) throw new NotFoundError('Booking not found');

        return this.appointmentRepo.findByIdPopulated(appointmentId) as Promise<IAppointment>;
    }


    // ─── 7. Cancel Booking ───────────────────────────────────────────────────

    /**
     * Huỷ booking.
     * Chỉ PENDING hoặc CONFIRMED mới được huỷ.
     * Customer chỉ được huỷ booking của chính mình.
     */
    async cancelBooking(
        appointmentId: string,
        dto: ICancelBooking,
        requesterId: string,
        requesterRole: string,
    ): Promise<IAppointment> {
        const appointment = await this.appointmentRepo.findById(appointmentId);
        if (!appointment) throw new NotFoundError('Booking not found');

        // Ownership check cho customer
        if (requesterRole === UserRole.CUSTOMER) {
            const customer = await customerRepository.findOne({
                user_id: new Types.ObjectId(requesterId),
            });
            if (!customer) throw new NotFoundError('Customer profile not found');
            if ((appointment.customer_id as Types.ObjectId).toString() !== (customer._id as Types.ObjectId).toString()) {
                throw new ForbiddenError('You are not allowed to cancel this booking');
            }
        }

        const cancellableStatuses: BookingStatus[] = [BookingStatus.PENDING, BookingStatus.CONFIRMED];
        if (!cancellableStatuses.includes(appointment.booking_status)) {
            throw new BadRequestError(
                `Cannot cancel a booking with status "${appointment.booking_status}"`,
            );
        }

        const updated = await this.appointmentRepo.updateById(appointmentId, {
            booking_status: BookingStatus.CANCELLED,
            cancelled_at: new Date(),
            cancellation_reason: dto.cancellation_reason,
        });
        if (!updated) throw new NotFoundError('Booking not found');

        return this.appointmentRepo.findByIdPopulated(appointmentId) as Promise<IAppointment>;
    }

    // ─── 8. Check-in ─────────────────────────────────────────────────────────

    /**
     * Customer/Staff check-in khi xe đến branch.
     * Chỉ CONFIRMED → CHECKED_IN.
     */
    async checkinBooking(appointmentId: string): Promise<IAppointment> {
        const appointment = await this.appointmentRepo.findById(appointmentId);
        if (!appointment) throw new NotFoundError('Booking not found');

        if (appointment.booking_status !== BookingStatus.CONFIRMED) {
            throw new BadRequestError(
                `Cannot check-in a booking with status "${appointment.booking_status}". Booking must be confirmed first.`,
            );
        }

        const updated = await this.appointmentRepo.updateById(appointmentId, {
            booking_status: BookingStatus.CHECKED_IN,
            checkedin_at: new Date(),
        });
        if (!updated) throw new NotFoundError('Booking not found');

        return this.appointmentRepo.findByIdPopulated(appointmentId) as Promise<IAppointment>;
    }

    // ─── 9. Start Service ────────────────────────────────────────────────────

    /**
     * Staff bắt đầu rửa xe.
     * Chỉ CHECKED_IN → (vẫn CHECKED_IN nhưng ghi started_at).
     * IoT pump sẽ được gọi riêng từ controller hoặc IoT route.
     */
    async startService(appointmentId: string): Promise<IAppointment> {
        const appointment = await this.appointmentRepo.findById(appointmentId);
        if (!appointment) throw new NotFoundError('Booking not found');

        if (appointment.booking_status !== BookingStatus.CHECKED_IN) {
            throw new BadRequestError(
                `Cannot start service on a booking with status "${appointment.booking_status}"`,
            );
        }

        if (appointment.started_at) {
            throw new ConflictError('Service has already been started for this booking');
        }

        const updated = await this.appointmentRepo.updateById(appointmentId, {
            booking_status: BookingStatus.IN_PROGRESS,
            started_at: new Date(),
        });
        if (!updated) throw new NotFoundError('Booking not found');

        return this.appointmentRepo.findByIdPopulated(appointmentId) as Promise<IAppointment>;
    }

    // ─── 10. Complete Booking ────────────────────────────────────────────────

    /**
     * Staff đánh dấu rửa xong (nhưng chưa thanh toán).
     * IN_PROGRESS → WASHED.
     */
    async washedBooking(appointmentId: string): Promise<IAppointment> {
        const appointment = await this.appointmentRepo.findById(appointmentId);
        if (!appointment) throw new NotFoundError('Booking not found');

        if (appointment.booking_status !== BookingStatus.IN_PROGRESS) {
            throw new BadRequestError(
                `Cannot mark as washed from status "${appointment.booking_status}"`,
            );
        }

        const updated = await this.appointmentRepo.updateById(appointmentId, {
            booking_status: BookingStatus.WASHED,
        });
        if (!updated) throw new NotFoundError('Booking not found');

        return this.appointmentRepo.findByIdPopulated(appointmentId) as Promise<IAppointment>;
    }

    /**
     * Staff đánh dấu hoàn thành.
     * WASHED (hoặc CHECKED_IN/IN_PROGRESS) → COMPLETED. 
     * Tính earned_membership_point từ subtotal.
     */
    async completeBooking(appointmentId: string): Promise<IAppointment> {
        const appointment = await this.appointmentRepo.findById(appointmentId);
        if (!appointment) throw new NotFoundError('Booking not found');

        if (![BookingStatus.CHECKED_IN, BookingStatus.IN_PROGRESS, BookingStatus.WASHED].includes(appointment.booking_status)) {
            throw new BadRequestError(
                `Cannot complete a booking with status "${appointment.booking_status}"`,
            );
        }

        if (!appointment.started_at) {
            throw new BadRequestError('Service must be started before completing');
        }

        // Tính membership points từ subtotal (snapshot prices)
        const subtotal = await this.appointmentServiceRepo.getSubtotal(appointmentId);
        const earnedPoints = Math.floor(subtotal / 10_000) * POINTS_PER_10K;

        const updated = await this.appointmentRepo.updateById(appointmentId, {
            booking_status: BookingStatus.COMPLETED,
            completed_at: new Date(),
            earned_membership_point: earnedPoints,
        });
        if (!updated) throw new NotFoundError('Booking not found');

        return this.appointmentRepo.findByIdPopulated(appointmentId) as Promise<IAppointment>;
    }

    // ─── Private Helpers ─────────────────────────────────────────────────────

    /**
     * Resolve, validate, và snapshot giá/duration cho từng service item.
     * Đảm bảo:
     *  - Service tồn tại & active.
     *  - Nếu có package, package phải chứa service đó.
     *  - Price của package = price service * (1 - discount%).
     */
    private async resolveServiceSnapshots(
        items: Array<{ service_id: string; service_package_id?: string }>,
    ): Promise<IServiceSnapshot[]> {
        const snapshots: IServiceSnapshot[] = [];

        for (const item of items) {
            const service = await Service.findById(item.service_id).lean();
            if (!service) {
                throw new NotFoundError(`Service not found: ${item.service_id}`);
            }
            if (!service.is_active) {
                throw new BadRequestError(`Service "${service.service_name}" is currently inactive`);
            }

            let priceSnapshot = service.service_price;
            let servicePackageId: Types.ObjectId | null = null;

            if (item.service_package_id) {
                // Kiểm tra package có chứa service này không (via PackageService junction)
                const packageLink = await PackageService.findOne({
                    service_id: new Types.ObjectId(item.service_id),
                    service_package_id: new Types.ObjectId(item.service_package_id),
                }).populate('service_package_id').lean();

                if (!packageLink) {
                    throw new BadRequestError(
                        `Service "${service.service_name}" does not belong to the specified package`,
                    );
                }

                const pkg = (packageLink as any).service_package_id;
                if (!pkg?.is_active) {
                    throw new BadRequestError(`Package is currently inactive`);
                }

                // Apply package discount
                const discountRate = (pkg.package_discount_percentage ?? 0) / 100;
                priceSnapshot = Math.round(service.service_price * (1 - discountRate));
                servicePackageId = new Types.ObjectId(item.service_package_id);
            }

            snapshots.push({
                service_id: new Types.ObjectId(item.service_id),
                service_package_id: servicePackageId,
                price_snapshot: priceSnapshot,
                duration_snapshot: service.duration_minutes,
            });
        }

        return snapshots;
    }

    /**
     * Validate rằng staff tồn tại, thuộc đúng branch, và đang có trong lịch làm việc.
     */
    private async validateStaffForAssignment(
        staffId: string,
        branchId: string,
    ): Promise<void> {
        const staff = await Staff.findById(staffId).lean();
        if (!staff) throw new NotFoundError('Staff not found');

        if (staff.branch_id?.toString() !== branchId) {
            throw new BadRequestError('Staff does not belong to this branch');
        }
    }
}

export const bookingService = new BookingService();
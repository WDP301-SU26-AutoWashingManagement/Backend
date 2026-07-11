import { Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { CacheAside } from '../../redis/decorators/cache-aside.decorator';

// 1. CHỈNH SỬA: Import đúng Interface/Model Invoice của dự án bạn vào đây
// Hãy thay đổi đường dẫn phù hợp với cấu trúc thư mục thực tế của bạn
import { Invoice, IInvoice } from '../../../models/invoice.model';

export class InvoiceRepository extends BaseRepository<IInvoice> {
    constructor() {
        super(Invoice);
    }

    // ─── READ METHODS (REPLICA) ─────────────────────────────────────────

    /**
     * Lấy danh sách hóa đơn đã thanh toán phục vụ màn hình Admin.
     */
    @CacheAside({
        keyPrefix: 'admin:paid-bookings',
        ttl: 300,
        hydrate: false,
        keyBuilder: (dates: { startDate?: string; endDate?: string }, branchId?: string | null) => {
            const startStr = dates?.startDate ? new Date(dates.startDate).toISOString().split('T')[0] : 'epoch';
            const endStr = dates?.endDate ? new Date(dates.endDate).toISOString().split('T')[0] : 'now';
            const branchStr = branchId ? branchId.toString() : 'all';
            return `${startStr}_to_${endStr}:${branchStr}`;
        }
    })
    async getPaidBookings(dates: { startDate?: string; endDate?: string }, branchId?: string | null) {
        let start = new Date(0);
        let end = new Date();
        end.setHours(23, 59, 59, 999);

        if (dates?.startDate) {
            start = new Date(dates.startDate);
            start.setHours(0, 0, 0, 0);
        }
        if (dates?.endDate) {
            end = new Date(dates.endDate);
            end.setHours(23, 59, 59, 999);
        }

        const pipeline: any[] = [
            {
                $match: {
                    invoice_status: 'paid',
                    paid_at: { $gte: start, $lte: end },
                }
            },
            {
                $lookup: {
                    from: 'appointments',
                    localField: 'appointment_id',
                    foreignField: '_id',
                    as: 'appointment'
                }
            },
            { $unwind: { path: '$appointment', preserveNullAndEmptyArrays: true } },
        ];

        if (branchId) {
            pipeline.push({
                $match: {
                    'appointment.branch_id': new Types.ObjectId(branchId)
                }
            });
        }

        pipeline.push(
            {
                $lookup: {
                    from: 'customers',
                    localField: 'customer_id',
                    foreignField: '_id',
                    as: 'customer'
                }
            },
            { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'vehicles',
                    localField: 'appointment.vehicle_id',
                    foreignField: '_id',
                    as: 'vehicle'
                }
            },
            { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'appointmentservices',
                    localField: 'appointment._id',
                    foreignField: 'appointment_id',
                    as: 'services'
                }
            },
            {
                $lookup: {
                    from: 'servicepackages',
                    localField: 'services.service_package_id',
                    foreignField: '_id',
                    as: 'servicePackages'
                }
            },
            {
                $addFields: {
                    service_package: { $arrayElemAt: ['$servicePackages', 0] }
                }
            },
            { $sort: { paid_at: -1 } }
        );

        // Sử dụng kết nối thông qua DB Replica ngầm định dạng tên model 'Invoice'
        const invoices = await this.rm.db.model('Invoice').aggregate(pipeline);
        return invoices;
    }
}

export const invoiceRepository = new InvoiceRepository();
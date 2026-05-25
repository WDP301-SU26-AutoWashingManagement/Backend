import { NextFunction, Request, Response } from 'express';
import { Promotion } from '../../../models/promotion.model';
import { Vehicle } from '../../../models/vehicle.model';
import { ServicePackage } from '../../../models/servicePackage.model';
import { Customer } from '../../../models/customer.model';
import { AppError } from '../../../common/utils/AppError';

export const validatePromotionForBooking = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const {
            promotion_id,
            vehicle_id,
            service_package_id,
        } = req.body;

        // không dùng promo -> skip
        if (!promotion_id) {
            return next();
        }

        const customerId = (req as any).user.id;

        const [promotion, vehicle, pkg, customer] = await Promise.all([
            Promotion.findOne({
                _id: promotion_id,
                is_active: true,
            }),

            Vehicle.findOne({
                _id: vehicle_id,
                customer_id: customerId,
            }),

            ServicePackage.findById(service_package_id),

            Customer.findOne({
                user_id: customerId,
            }),
        ]);

        if (!promotion) {
            throw new AppError(
                'Khuyến mãi không tồn tại hoặc đã hết hạn',
                404,
            );
        }

        if (!vehicle) {
            throw new AppError(
                'Phương tiện không hợp lệ',
                404,
            );
        }

        if (!pkg || !pkg.is_active) {
            throw new AppError(
                'Gói dịch vụ không hợp lệ',
                404,
            );
        }

        if (!promotion.isValid()) {
            throw new AppError(
                'Khuyến mãi đã hết hạn',
                400,
            );
        }

        const objects = promotion.promotion_objects;

        // vehicle type
        if (
            objects.vehicle_types?.length &&
            !objects.vehicle_types.includes(vehicle.vehicle_type)
        ) {
            throw new AppError(
                'Khuyến mãi không áp dụng cho loại xe này',
                400,
            );
        }

        // service
        if (
            objects.services?.length &&
            !objects.services.includes(pkg._id.toString())
        ) {
            throw new AppError(
                'Khuyến mãi không áp dụng cho dịch vụ này',
                400,
            );
        }

        // tier
        if ( objects.tiers?.length &&
            (
                !customer?.tier_id ||
                !objects.tiers.includes(customer.tier_id.toString())
            )
        ) {
            throw new AppError(
                'Khuyến mãi không áp dụng cho hạng thành viên này',
                400,
            );
        }

        // attach promotion vào req để khỏi query lại
        (req as any).promotion = promotion;

        next();
    } catch (error) {
        next(error);
    }
};
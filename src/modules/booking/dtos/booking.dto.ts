import {
    IsMongoId,
    IsNumber,
    IsIn,
    IsOptional,
    IsString,
    IsNotEmpty,
    IsDateString,
    Min,
    MaxLength,
    IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatus } from '../../../models/washBooking.model';

// ─────────────────────────────────────────────
// BookingService.createBooking()
// ─────────────────────────────────────────────
export class CreateBookingDto {
    @IsMongoId()
    vehicle_id!: string;

    @IsMongoId()
    service_package_id!: string;

    @IsOptional()
    @IsMongoId()
    promotion_id?: string;

    @IsDateString()
    scheduled_at!: string;           // ISO 8601 — service sẽ new Date() sau

    @IsIn(['app', 'web', 'admin'])
    booking_source!: 'app' | 'web' | 'admin';
}

// ─────────────────────────────────────────────
// BookingService.cancelBooking()
// ─────────────────────────────────────────────
export class CancelBookingDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    reason!: string;
}

// ─────────────────────────────────────────────
// BookingService.getBookingList()
// ─────────────────────────────────────────────
export class GetBookingListDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @IsOptional()
    @IsMongoId()
    customer_id?: string;

    @IsOptional()
    @IsMongoId()
    vehicle_id?: string;

    @IsOptional()
    @IsIn(['pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled'])
    booking_status?: BookingStatus;

    @IsOptional()
    @IsDateString()
    scheduled_from?: string;         // Lọc từ ngày (scheduled_at >= scheduled_from)

    @IsOptional()
    @IsDateString()
    scheduled_to?: string;           // Lọc đến ngày (scheduled_at <= scheduled_to)
}

// ─────────────────────────────────────────────
// BookingService.updateStatus()
// ─────────────────────────────────────────────
export class UpdateBookingStatusDto {
    @IsIn(['confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled'])
    status!: BookingStatus;
}

// ─────────────────────────────────────────────
// BookingService.findBookingByPlateNumber()
// ─────────────────────────────────────────────
export class FindByPlateNumberDto {
    @IsString()
    @IsNotEmpty()
    plate_number!: string;           // Controller lấy từ req.params rồi map vào đây
}
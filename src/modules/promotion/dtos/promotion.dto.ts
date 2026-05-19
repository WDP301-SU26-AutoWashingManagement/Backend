import {
    IsString,
    IsEnum,
    IsNumber,
    IsOptional,
    IsBoolean,
    IsDateString,
    IsMongoId,
    IsInt,
    Min,
    Max,
    MinLength,
    MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─────────────────────────────────────────────
// PromotionService.createPromotion()
// ─────────────────────────────────────────────
export class CreatePromotionDto {
    @IsString()
    @MinLength(3)
    @MaxLength(50)
    promotion_code!: string;

    @IsOptional()
    promotion_objects?: Record<string, unknown>;

    @IsEnum(['percentage', 'fixed'])
    discount_type!: 'percentage' | 'fixed';

    @IsNumber()
    @Min(0)
    discount_value!: number;

    @IsOptional()
    @IsBoolean()
    auto_post?: boolean;

    @IsDateString()
    start_at!: string;

    @IsDateString()
    end_at!: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1)
    usage_limit?: number | null;
}

// ─────────────────────────────────────────────
// PromotionService.updatePromotion()
// ─────────────────────────────────────────────
export class UpdatePromotionDto {
    @IsOptional()
    promotion_objects?: Record<string, unknown>;

    @IsOptional()
    @IsEnum(['percentage', 'fixed'])
    discount_type?: 'percentage' | 'fixed';

    @IsOptional()
    @IsNumber()
    @Min(0)
    discount_value?: number;

    @IsOptional()
    @IsBoolean()
    auto_post?: boolean;

    @IsOptional()
    @IsDateString()
    start_at?: string;

    @IsOptional()
    @IsDateString()
    end_at?: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1)
    usage_limit?: number | null;
}

// ─────────────────────────────────────────────
// PromotionService.toggleActive()
// ─────────────────────────────────────────────
export class ToggleActiveDto {
    @IsBoolean()
    is_active!: boolean;
}

// ─────────────────────────────────────────────
// PromotionService.getPromotionList()
// ─────────────────────────────────────────────
export class GetPromotionListDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @IsOptional()
    @IsEnum(['percentage', 'fixed'])
    discount_type?: 'percentage' | 'fixed';

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsDateString()
    start_from?: string;

    @IsOptional()
    @IsDateString()
    start_to?: string;

    @IsOptional()
    @IsDateString()
    end_from?: string;

    @IsOptional()
    @IsDateString()
    end_to?: string;
}

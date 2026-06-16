import { EPromotionType } from "../../../models/promotion.model";

export interface ICreatePromotion {
    promotion_name: string;
    description: string;
    code: string;
    type: EPromotionType;
    service_ids: string[];
    discount_percentage: number;
    discount_amount: number;
    min_order_amount: number;
    start_date: Date;
    end_date: Date;
    is_active: boolean;
}

export interface IUpdatePromotion {
    promotion_name?: string;
    description?: string;
    code?: string;
    type?: string;
    service_ids?: string[];
    discount_percentage?: number;
    discount_amount?: number;
    min_order_amount?: number;
    start_date?: Date;
    end_date?: Date;
    is_active?: boolean;
}

export interface IGetPromotionList {
    page?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
    type?: string;
}

export interface IGetDiscount {
    code: string;
}

export interface IPromotionType {
    type: EPromotionType;
}

export interface IResponseDiscount {
    id: string;
    promotion_name: string;
    description: string;
    code: string;
    type: EPromotionType;
    service_ids: string[];
    discount_percentage: number;
    discount_amount: number;
    min_order_amount: number;
    start_date: Date;
    end_date: Date;
    is_active: boolean;
}

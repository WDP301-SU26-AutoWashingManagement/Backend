// promotion.interface.ts

export interface ICreatePromotion {
    promotion_code: string;
    promotion_objects?: Record<string, unknown>;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    auto_post?: boolean;
    start_at: string;
    end_at: string;
    is_active?: boolean;
    usage_limit?: number | null;
}

export interface IUpdatePromotion {
    promotion_objects?: Record<string, unknown>;
    discount_type?: 'percentage' | 'fixed';
    discount_value?: number;
    auto_post?: boolean;
    start_at?: string;
    end_at?: string;
    is_active?: boolean;
    usage_limit?: number | null;
}

export interface IToggleActive {
    is_active: boolean;
}

export interface IGetPromotionList {
    page: number;
    limit: number;
    is_active?: boolean;
    discount_type?: 'percentage' | 'fixed';
    search?: string;
    start_from?: string;
    start_to?: string;
    end_from?: string;
    end_to?: string;
}
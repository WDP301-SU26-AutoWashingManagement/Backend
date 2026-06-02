export interface IBranchRequest {
    web_url?: string;
    branch_phone?: string;

    branch_address?: {
        street: string;
        ward: string;
        district: string;
        city: string;
    };

    geo?: {
        longitude: number;
        latitude: number;
    };

    operating_time: {
        default_open: string;
        default_close: string;
        weekend_open?: string;
        weekend_close?: string;
    };

    is_holiday_off?: boolean;
    bay_counts: number;
    is_active?: boolean;
}



export interface ICreateService {
    service_group_id: string;
    service_name:     string;
    description?:     string;
    service_price:    number;
    duration_minutes: number;
    is_active?:       boolean;
}

export interface IUpdateService {
    service_group_id?: string;
    service_name?:     string;
    description?:      string;
    service_price?:    number;
    duration_minutes?: number;
    is_active?:        boolean;
}

export interface IToggleActive {
    is_active: boolean;
}

export interface IGetServiceList{
    page?:      number;
    limit?:     number;
    is_active?: boolean;
    search?:    string;
}
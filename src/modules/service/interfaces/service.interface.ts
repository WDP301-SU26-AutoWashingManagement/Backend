export interface ICreateServicePackage {
    service_name:     string;
    description?:     string;
    service_price:    number;
    duration_minutes: number;
    is_active?:       boolean;
}

export interface IUpdateServicePackage {
    service_name?:     string;
    description?:      string;
    service_price?:    number;
    duration_minutes?: number;
    is_active?:        boolean;
}

export interface IToggleActive {
    is_active: boolean;
}

export interface IGetServicePackageList{
    page?:      number;
    limit?:     number;
    is_active?: boolean;
    search?:    string;
}
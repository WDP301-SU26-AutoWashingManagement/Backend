export interface ICreateServicePackage {
    service_group_id: string;
    package_name: string;
    description: string;
    package_discount_percentage?: number;
    service_ids: string[];
}

export interface IUpdateServicePackage {
    service_group_id?: string;
    package_name?: string;
    description?: string;
    package_discount_percentage?: number;
    service_ids?: string[];
}

export interface IToggleActive {
    is_active: boolean;
}

export interface IGetServicePackageList {
    page?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
}
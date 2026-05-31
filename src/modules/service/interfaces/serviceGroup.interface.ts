
export interface ICreateServiceGroup {
    group_name:       string;
    description?:     string;
}

export interface IUpdateServiceGroup {
    group_name?:       string;
    description?:     string;
}

export interface IToggleActive {
    is_active: boolean;
}

export interface IGetServiceGroupList{
    page?:      number;
    limit?:     number;
    is_active?: boolean;
    search?:    string;
}
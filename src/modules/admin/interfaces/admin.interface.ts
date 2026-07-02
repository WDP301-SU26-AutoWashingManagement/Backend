export interface IBookingCount {
    startDate: string;
    endDate: string;
}

export interface IProfitQuery {
    startDate: string;
    endDate: string;
}

export interface IDailyProfit {
    date: string;
    profit: number;
}

export interface ITopService {
    servicePackageId: string;
    serviceName: string;
    count: number;
}

export interface ITopServiceRevenue {
    servicePackageId: string;
    serviceName: string;
    revenue: number;
}

export interface ITopIndividualService {
    serviceId: string;
    serviceName: string;
    count: number;
}

export interface ITopIndividualServiceRevenue {
    serviceId: string;
    serviceName: string;
    revenue: number;
}

export interface IAdminUpdate {
    user_id?: string;
}

export interface IHourlyBooking {
    time: string;
    count: number;
}
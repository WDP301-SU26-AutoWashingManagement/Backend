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
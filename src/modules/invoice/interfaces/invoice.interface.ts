export interface ICreateInvoiceRequest {
    appointment_id       : string;
    discount_amount?     : number;
    tax_rate?            : number;    // ví dụ: 0.1 = 10%
    promotion_id?        : string;
    customer_voucher_id? : string;
    vat_requested?       : boolean;
    tax_code?            : string;
}

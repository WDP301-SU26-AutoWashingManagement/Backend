export interface ICreateInvoiceRequest {
    appointment_id       : string;
    tax_rate?            : number;    // ví dụ: 0.1 = 10%
    promotion_id?        : string;    // discount_amount được tính tự động từ promotion
    customer_voucher_id? : string;
    vat_requested?       : boolean;
    tax_code?            : string;
}
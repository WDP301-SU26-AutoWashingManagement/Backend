import { ICompensationForm } from "../../models/appointment.model";

export class ExportCompensationDto implements ICompensationForm {
    branch_info!: string;
    customer_info!: {
        fullname: string;
        phone: string;
        email: string;
    };
    compensation_amount!: number;
    transfer_image!: string | null;
    qr_image?: string | null;
    admin_signature!: string;
    customer_signature!: string;
    customer_signature_confirm?: string | null;
    created_at!: Date;

    constructor(partial: Partial<ExportCompensationDto>) {
        Object.assign(this, partial);
        // Fallback thời gian tạo nếu client không truyền
        if (!this.created_at) {
            this.created_at = new Date();
        }
    }

    public validate(): { isValid: boolean; message?: string } {
        if (!this.branch_info) return { isValid: false, message: 'Thiếu thông tin chi nhánh (branch_info)' };
        if (!this.customer_info?.fullname) return { isValid: false, message: 'Thiếu tên khách hàng' };
        if (typeof this.compensation_amount !== 'number') return { isValid: false, message: 'Số tiền không hợp lệ' };
        if (!this.customer_signature) return { isValid: false, message: 'Thiếu chữ ký khách hàng' };
        if (!this.admin_signature) return { isValid: false, message: 'Thiếu chữ ký Admin' };
        return { isValid: true };
    }
}
import { ImageType } from "../../../common/constants/image-type.enum";

export interface IBillDetails {
    provider: string;
    transactionId: string | null;
    amount: string | null;
}

export type VerificationDetails = IBillDetails | IQrDetails | Record<string, any>;

export interface IQrDetails {
    qrData: string | null;       // Dữ liệu thô đọc được từ QR
    isVietQR: boolean;           // Có phải chuẩn VietQR (chuyển khoản ngân hàng) không
    bankBin?: string | null;     // Mã BIN Ngân hàng (nếu là VietQR)
    accountNumber?: string | null; // Số tài khoản (nếu là VietQR)
}

export interface IVerificationResult {
    isValid: boolean;
    confidence: number;
    type: ImageType;
    details: IBillDetails | IQrDetails | any;
    reason: string;
    rawText?: string;
    processingTime?: string;
}

export interface IVerificationStrategy {
    verify(rawText: string): Promise<IVerificationResult>;
}
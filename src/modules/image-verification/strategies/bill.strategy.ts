import { BaseVerificationStrategy } from './base.strategy';
import { VerificationResultDto } from '../dtos/verification-result.dto';
import { ImageType } from '../../../common/constants/image-type.enum';
import { IBillDetails, IVerificationResult } from '../interfaces/verification.interface';

export class BillVerificationStrategy extends BaseVerificationStrategy {
    /**
     * Helper: Chuyển chuỗi tiếng Việt có dấu thành không dấu & viết hoa
     * Ví dụ: "Chuyển tien thanhcong!" -> "CHUYEN TIEN THANHCONG!"
     */
    private removeVietnameseTones(str: string): string {
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/Đ/g, 'D')
            .replace(/đ/g, 'd')
            .toUpperCase();
    }

    async verify(rawText: string): Promise<IVerificationResult> {
        const rawUpper = rawText.toUpperCase();
        const cleanText = this.removeVietnameseTones(rawText);

        // 1. Danh sách Ngân hàng / Ví điện tử
        const providers = [
            { name: 'ACB', keywords: ['ACB', 'A CHAU', 'NGAN HANG A CHAU'] },
            { name: 'MoMo', keywords: ['MOMO', 'VI MOMO'] },
            { name: 'VNPay', keywords: ['VNPAY'] },
            { name: 'ZaloPay', keywords: ['ZALOPAY', 'ZALO PAY'] },
            { name: 'MBBank', keywords: ['MBBANK', 'MB BANK', 'QUAN DOI'] },
            { name: 'Vietcombank', keywords: ['VIETCOMBANK', 'VCB'] },
            { name: 'Techcombank', keywords: ['TECHCOMBANK', 'TCB', 'KY THUONG'] },
            { name: 'VietinBank', keywords: ['VIETINBANK', 'CONG THUONG'] },
            { name: 'BIDV', keywords: ['BIDV'] },
            { name: 'TPBank', keywords: ['TPBANK', 'TIEN PHONG'] },
            { name: 'VPBank', keywords: ['VPBANK'] },
        ];

        // 2. Danh sách Từ khóa nhận diện Bill (Dùng dạng KHÔNG DẤU để khớp OCR nhiễu)
        const successKeywords = [
            'CHUYEN TIEN THANH CONG',
            'CHUYEN TIEN THANHCONG', // Chấp nhận OCR dính chữ
            'GIAO DICH THANH CONG',
            'GIAO DICH THANHCONG',
            'THANH TOAN CHO',
            'THANH CONG',
            'MA GIAO DICH',
            'MA GD',
            'SO THAM CHIEU',
            'CHI TIET GIAO DICH',
            'NOI DUNG',
            'CHUYEN LUC',
            'NGUOI NHAN',
            'NAPAS',
            'BA MUOI NGHIN', // Từ đọc số tiền
            'DONG'
        ];

        let score = 0;
        let detectedProvider = 'Unknown';
        let matchedKeywordsCount = 0;

        // Check Provider (+0.3)
        for (const p of providers) {
            if (p.keywords.some((kw) => cleanText.includes(kw))) {
                detectedProvider = p.name;
                score += 0.3;
                break;
            }
        }

        // Check Keywords (+0.1/từ, max 0.5)
        for (const kw of successKeywords) {
            if (cleanText.includes(kw)) {
                matchedKeywordsCount++;
            }
        }
        score += Math.min(matchedKeywordsCount * 0.1, 0.5);

        // 3. Regex Mã giao dịch (+0.2)
        const transIdRegex = /(?:MA GIAO DICH|MA GD|SO THAM CHIEU|TRANS ID|REF)[:\s]*([A-Z0-9]{3,25})/i;
        const transMatch = cleanText.match(transIdRegex);
        const transactionId = transMatch ? transMatch[1].trim() : null;
        if (transactionId) score += 0.2;

        // 4. Regex Số tiền NÂNG CẤP (Bắt được cả '20000VND', '30.000 VNĐ', '-35.000đ')
        // Match số tiền dính liền hoặc có chấm/phẩy trước các đơn vị VND/VNĐ/Đ
        const amountRegex = /(-?\s*[0-9]{1,3}(?:[.,][0-9]{3})+|-?\s*[0-9]{4,9})\s*(?:VND|VNĐ|Đ|DONG)/i;
        const amountMatch = rawUpper.match(amountRegex);
        let amount: string | null = null;

        if (amountMatch) {
            // Lấy chuỗi số, loại bỏ dấu trừ nếu có
            const rawAmount = amountMatch[1].replace('-', '').trim();

            // Nếu là chuỗi số thuần không chấm (VD: 20000) -> Format thành 20.000
            if (!rawAmount.includes('.') && !rawAmount.includes(',')) {
                amount = `${Number(rawAmount).toLocaleString('vi-VN')} VNĐ`;
            } else {
                amount = `${rawAmount} VNĐ`;
            }
        }

        // 5. Kết quả Confidence
        const finalConfidence = Math.min(Math.max(score, 0.0), 1.0);
        const isValid = finalConfidence >= 0.5;

        let reason = `Tìm thấy ${matchedKeywordsCount} từ khóa hợp lệ.`;
        if (detectedProvider !== 'Unknown') reason += ` Ngân hàng/Ví: ${detectedProvider}.`;
        if (!isValid) reason = 'Ảnh không chứa đủ từ khóa hoặc cấu trúc của bill chuyển khoản.';

        const details: IBillDetails = {
            provider: detectedProvider,
            transactionId,
            amount,
        };

        return new VerificationResultDto({
            isValid,
            confidence: finalConfidence,
            type: ImageType.BILL,
            details,
            reason,
            rawText,
        });
    }
}
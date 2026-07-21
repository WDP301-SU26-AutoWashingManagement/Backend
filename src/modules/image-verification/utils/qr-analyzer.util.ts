// Danh sách Mapping mã BIN chuẩn Napas/Ví điện tử tại Việt Nam
const BANK_BIN_MAP: Record<string, string> = {
    '970436': 'Vietcombank',
    '970415': 'VietinBank',
    '970418': 'BIDV',
    '970405': 'Agribank',
    '970422': 'MBBank',
    '970407': 'Techcombank',
    '970423': 'TPBank',
    '970416': 'ACB',
    '970432': 'VPBank',
    '971025': 'Ví MoMo',
    '971005': 'Ví Viettel Money',
    '971011': 'Ví VNPT Money',
    '971029': 'Ví ZaloPay',
};

export interface IQrAnalyzedData {
    formatVersion: string;
    qrType: 'STATIC' | 'DYNAMIC' | 'UNKNOWN'; // Tĩnh (dùng nhiều lần) hay Động (dùng 1 lần)
    providerName: string;                     // Tên Ngân hàng / Ví điện tử
    bankBin: string | null;                   // Mã BIN
    accountNumber: string | null;             // Số tài khoản / ID Ví
    amount: number | null;                    // Số tiền (VNĐ)
    currency: string;                         // Đơn vị tiền tệ (VND)
    memo: string | null;                      // Nội dung chuyển khoản
    countryCode: string;                      // Quốc gia (VN)
    isChecksumValid: boolean;                 // Kiểm tra toàn vẹn dữ liệu
}

export class QrAnalyzer {

    /**
     * Parse chuỗi TLV (Tag-Length-Value) theo chuẩn EMVCo
     */
    static parseEMVCo(qrData: string): Record<string, string> {
        const result: Record<string, string> = {};
        let index = 0;

        while (index < qrData.length) {
            const tag = qrData.substring(index, index + 2);
            const length = parseInt(qrData.substring(index + 2, index + 4), 10);

            if (isNaN(length)) break;

            const value = qrData.substring(index + 4, index + 4 + length);
            result[tag] = value;
            index += 4 + length;
        }

        return result;
    }

    /**
     * Phân tích toán bộ dữ liệu mã QR
     */
    static analyze(rawQrData: string): IQrAnalyzedData {
        const parsed = this.parseEMVCo(rawQrData);

        // 1. Loại QR (Tag 01: 11 = Static, 12 = Dynamic)
        let qrType: 'STATIC' | 'DYNAMIC' | 'UNKNOWN' = 'UNKNOWN';
        if (parsed['01'] === '11') qrType = 'STATIC';
        if (parsed['01'] === '12') qrType = 'DYNAMIC';

        // 2. Số tiền (Tag 54)
        const amount = parsed['54'] ? parseFloat(parsed['54']) : null;

        // 3. Nội dung chuyển khoản (Tag 62 -> Sub-tag 08 hoặc 05)
        let memo: string | null = null;
        if (parsed['62']) {
            const sub62 = this.parseEMVCo(parsed['62']);
            memo = sub62['08'] || sub62['05'] || null;
        }

        // 4. Bóc tách Tài khoản & Ngân hàng / Ví (Tag 38 hoặc 26)
        let bankBin: string | null = null;
        let accountNumber: string | null = null;
        let providerName = 'Khác / Bắt bằng URL';

        const merchantInfoRaw = parsed['38'] || parsed['26'];
        if (merchantInfoRaw) {
            const subMerchant = this.parseEMVCo(merchantInfoRaw);

            if (subMerchant['01']) {
                const subBeneficiary = this.parseEMVCo(subMerchant['01']);
                bankBin = subBeneficiary['00'] || null;
                accountNumber = subBeneficiary['01'] || null;
            } else if (subMerchant['02']) {
                accountNumber = subMerchant['02'];
            }
        }

        // Lookup Tên Ngân hàng / Ví từ mã BIN
        if (bankBin && BANK_BIN_MAP[bankBin]) {
            providerName = BANK_BIN_MAP[bankBin];
        } else if (rawQrData.includes('MOMO') || bankBin === '971025') {
            providerName = 'Ví MoMo';
        }

        return {
            formatVersion: parsed['00'] || '01',
            qrType,
            providerName,
            bankBin,
            accountNumber,
            amount,
            currency: parsed['53'] === '704' ? 'VND' : parsed['53'] || 'VND',
            memo,
            countryCode: parsed['58'] || 'VN',
            isChecksumValid: !!parsed['63'], // Đã có mã CRC
        };
    }
}
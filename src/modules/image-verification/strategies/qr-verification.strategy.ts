import jsqr from 'jsqr';
import sharp from 'sharp';
import { BaseVerificationStrategy } from './base.strategy';
import { VerificationResultDto } from '../dtos/verification-result.dto';
import { IVerificationResult } from '../interfaces/verification.interface';
import { ImageType } from '@common/constants/image-type.enum';
import { QrAnalyzer } from '../utils/qr-analyzer.util';

export class QrVerificationStrategy extends BaseVerificationStrategy {

    async verifyFromBuffer(imageBuffer: Buffer): Promise<IVerificationResult> {
        const startTime = performance.now();

        try {
            // 1. Convert Buffer sang Raw Pixel Data bằng Sharp
            const { data, info } = await sharp(imageBuffer)
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });

            // 2. Scan QR Code
            const qrCode = jsqr(new Uint8ClampedArray(data), info.width, info.height);
            const endTime = performance.now();
            const durationMs = (endTime - startTime).toFixed(0);

            if (!qrCode || !qrCode.data) {
                return new VerificationResultDto({
                    isValid: false,
                    confidence: 0.0,
                    type: ImageType.QR,
                    details: null,
                    reason: 'Không tìm thấy hoặc không thể giải mã Mã QR Code trong hình ảnh.',
                    processingTime: `${durationMs}ms`,
                });
            }

            const rawQrData = qrCode.data;
            let score = 0.5;
            let isVietQR = false;
            let analysisResult: any = null;

            // 3. Phân tích Dữ liệu QR
            if (rawQrData.startsWith('000201') && (rawQrData.includes('A000000727') || rawQrData.includes('0010A000000727'))) {
                isVietQR = true;
                score += 0.5; // Confidence = 1.0

                // 🎯 GỌI HÀM PHÂN TÍCH CHI TIẾT DỮ LIỆU TẠI ĐÂY
                analysisResult = QrAnalyzer.analyze(rawQrData);
            } else if (rawQrData.startsWith('http://') || rawQrData.startsWith('https://')) {
                score += 0.3;
                analysisResult = { url: rawQrData, type: 'URL' };
            } else {
                score += 0.2;
                analysisResult = { text: rawQrData, type: 'TEXT' };
            }

            const finalConfidence = Math.min(score, 1.0);

            return new VerificationResultDto({
                isValid: finalConfidence >= 0.7,
                confidence: finalConfidence,
                type: ImageType.QR,
                details: {
                    qrData: rawQrData,
                    isVietQR,
                    analysis: analysisResult
                },
                reason: isVietQR
                    ? `Quét thành công: Mã QR ${analysisResult?.providerName || 'Thanh toán'} hợp lệ.`
                    : 'Quét thành công Mã QR Code.',
                rawText: rawQrData,
                processingTime: `${durationMs}ms`,
            });

        } catch (error: any) {
            const endTime = performance.now();
            return new VerificationResultDto({
                isValid: false,
                confidence: 0.0,
                type: ImageType.QR,
                details: null,
                reason: `Lỗi xử lý hình ảnh QR: ${error.message}`,
                processingTime: `${(endTime - startTime).toFixed(0)}ms`,
            });
        }
    }

    async verify(rawText: string): Promise<IVerificationResult> {
        throw new Error('QR Verification yêu cầu truyền vào Image Buffer.');
    }
}
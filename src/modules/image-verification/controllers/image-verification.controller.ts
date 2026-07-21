import { Request, Response } from 'express';
import { ocrRepository } from '../repositories/ocr.repository';
import { VerificationStrategyFactory } from '../factories/strategy.factory';
import { QrVerificationStrategy } from '../strategies/qr-verification.strategy';

const ocrRepo = ocrRepository;

export class VerificationController {
    async verifyWithSSE(req: Request, res: Response) {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Thiếu file ảnh' });
        }

        // 1. Thiết lập Header chuẩn cho Server-Sent Events (SSE)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Tương thích với Express flush context
        if (typeof (res as any).flushHeaders === 'function') {
            (res as any).flushHeaders();
        }

        // Helper gửi dữ liệu progress về cho client
        const sendProgress = (percent: number, step: string, data: any = null) => {
            res.write(`data: ${JSON.stringify({ progress: percent, step, data })}\n\n`);
        };

        try {
            const type = (req.body.type || 'BILL').toUpperCase();
            const strategy = VerificationStrategyFactory.getStrategy(type);

            // --- LUỒNG 1: XỬ LÝ ẢNH QR CODE ---
            if (type === 'QR') {
                sendProgress(20, 'Đang đọc và giải mã QR Code...');

                // QR Code giải mã trực tiếp từ Buffer
                const result = await (strategy as QrVerificationStrategy).verifyFromBuffer(req.file.buffer);

                sendProgress(90, 'Đang phân tích định dạng QR Code...');
                sendProgress(100, 'Xử lý QR Code thành công!', result);
                return;
            }

            // --- LUỒNG 2: XỬ LÝ ẢNH BILL (OCR) ---
            // Step 1: Khởi tạo OCR (10%)
            sendProgress(10, 'Đã nhận ảnh Bill, đang khởi tạo bộ quét OCR...');

            // Step 2: Quét Tesseract OCR (10% -> 80%)
            const rawText = await ocrRepo.extractTextWithProgress(
                req.file.buffer,
                (ocrPercent) => {
                    // Quy đổi tiến độ Tesseract (0-100%) sang dải tiến độ hệ thống (10% -> 80%)
                    const currentProgress = 10 + Math.round((ocrPercent * 70) / 100);
                    sendProgress(currentProgress, `Đang nhận diện chữ trên Bill (${ocrPercent}%)...`);
                }
            );

            // Step 3: Đánh giá Confidence bằng Bill Strategy (90%)
            sendProgress(90, 'Đang kiểm tra độ tin cậy và đối soát dữ liệu Bill...');
            const result = await strategy.verify(rawText);

            // Step 4: Hoàn thành (100%)
            sendProgress(100, 'Xử lý Bill thành công!', result);

        } catch (error: any) {
            sendProgress(-1, `Lỗi xử lý: ${error.message}`);
        } finally {
            res.end(); // Ngắt kết nối SSE sau khi xử lý xong
        }
    }
}

export const verificationController = new VerificationController();
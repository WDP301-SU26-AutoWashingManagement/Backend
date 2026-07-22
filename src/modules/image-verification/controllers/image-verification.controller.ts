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
            const type = (req.body.type || 'AUTO').toUpperCase();

            // --- LUỒNG 1: AUTO DETECT HOẶC QR CODE ---
            if (type === 'QR' || type === 'AUTO') {
                sendProgress(10, 'Đang kiểm tra và quét QR Code...');
                
                const qrStrategy = VerificationStrategyFactory.getStrategy('QR') as QrVerificationStrategy;
                const qrResult = await qrStrategy.verifyFromBuffer(req.file.buffer);
                
                // Nếu quét ra QR hợp lệ (hoặc user ép buộc type=QR) thì trả về kết quả
                if (qrResult.isValid || type === 'QR') {
                    sendProgress(100, 'Xử lý QR Code thành công!', qrResult);
                    return;
                }
                
                // Nếu AUTO mà QR không ra gì, sẽ rơi xuống luồng OCR
                sendProgress(20, 'Không phát hiện QR Code, chuyển sang quét hóa đơn...');
            }

            // --- LUỒNG 2: XỬ LÝ ẢNH BILL (OCR) ---
            const billStrategy = VerificationStrategyFactory.getStrategy('BILL');
            
            // Step 1: Khởi tạo OCR (Tăng tiếp % từ luồng trước)
            sendProgress(25, 'Đang khởi tạo bộ quét AI OCR...');

            // Step 2: Quét Tesseract OCR (25% -> 80%)
            const rawText = await ocrRepo.extractTextWithProgress(
                req.file.buffer,
                (ocrPercent) => {
                    // Quy đổi tiến độ Tesseract (0-100%) sang dải tiến độ hệ thống (25% -> 80%)
                    const currentProgress = 25 + Math.round((ocrPercent * 55) / 100);
                    sendProgress(currentProgress, `Đang nhận diện chữ trên Bill (${ocrPercent}%)...`);
                }
            );

            // Step 3: Đánh giá Confidence bằng Bill Strategy (90%)
            sendProgress(90, 'Đang phân tích độ tin cậy và trích xuất dữ liệu Bill...');
            const result = await billStrategy.verify(rawText);

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
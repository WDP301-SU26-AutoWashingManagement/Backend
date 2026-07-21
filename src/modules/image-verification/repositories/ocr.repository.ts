import { createWorker, Worker } from 'tesseract.js';
import sharp from 'sharp';

export class OcrRepository {
    private worker: Worker | null = null;

    // Khởi tạo Worker 1 lần duy nhất khi khởi động App
    private async getWorker(): Promise<Worker> {
        if (!this.worker) {
            // Khởi tạo worker hỗ trợ vie + eng
            this.worker = await createWorker(['vie', 'eng']);
        }
        return this.worker;
    }

    /**
     * Tối ưu hóa dung lượng & chất lượng ảnh trước khi OCR
     */
    private async optimizeImage(imageBuffer: Buffer): Promise<Buffer> {
        return sharp(imageBuffer)
            .resize({ width: 1000, withoutEnlargement: true })
            .grayscale()
            .toBuffer();
    }

    /**
     * Trích xuất text đơn giản (Dùng buffer đã tối ưu qua sharp)
     */
    async extractTextFromBuffer(imageBuffer: Buffer): Promise<string> {
        const optimizedBuffer = await this.optimizeImage(imageBuffer);
        const worker = await this.getWorker();
        const { data } = await worker.recognize(optimizedBuffer);
        return data.text || '';
    }

    /**
     * Trích xuất text có hỗ trợ Callback báo tiến độ % (Dành cho SSE / Streaming progress)
     */
    async extractTextWithProgress(
        imageBuffer: Buffer,
        onProgress?: (progressPercent: number, status: string) => void,
    ): Promise<string> {
        const optimizedBuffer = await this.optimizeImage(imageBuffer);

        // Lưu ý: Nếu muốn bắt logger realtime từng request tốt nhất trên Tesseract v5+, 
        // chúng ta tạo/gán logger cho tiến trình nhận diện
        const worker = await createWorker(['vie', 'eng'], 1, {
            logger: (m) => {
                if (m.status === 'recognizing text' && onProgress) {
                    const percent = Math.round((m.progress || 0) * 100);
                    onProgress(percent, m.status);
                }
            },
        });

        try {
            const { data } = await worker.recognize(optimizedBuffer);
            await worker.terminate(); // Giải phóng worker ngắn hạn này sau khi xong job stream
            return data.text || '';
        } catch (error: any) {
            await worker.terminate();
            throw error;
        }
    }
}

export const ocrRepository = new OcrRepository();
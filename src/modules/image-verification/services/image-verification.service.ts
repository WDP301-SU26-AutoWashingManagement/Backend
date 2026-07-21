import { OcrRepository } from '../repositories/ocr.repository';
import { VerificationStrategyFactory } from '../factories/strategy.factory';
import { IVerificationResult } from '../interfaces/verification.interface';

export class ImageVerificationService {
    private ocrRepository: OcrRepository;

    constructor() {
        this.ocrRepository = new OcrRepository();
    }

    async verifyImage(fileBuffer: Buffer, imageType: string): Promise<IVerificationResult> {
        if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
            const error: any = new Error('File buffer truyền vào không hợp lệ!');
            error.statusCode = 400;
            throw error;
        }

        // 1. Lấy Strategy xử lý dựa vào ImageType
        const strategy = VerificationStrategyFactory.getStrategy(imageType);

        // 2. Trích xuất text từ OCR
        const rawText = await this.ocrRepository.extractTextFromBuffer(fileBuffer);

        // 3. Thực thi Strategy kiểm tra confidence
        return await strategy.verify(rawText);
    }
}
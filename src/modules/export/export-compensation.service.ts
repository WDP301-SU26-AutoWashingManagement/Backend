import createReport from 'docx-templates';
import * as fs from 'fs';
import * as path from 'path';
import { ExportCompensationDto } from './export-compensation.dto';

export class ExportCompensationService {
    private static base64ToBuffer(base64Str: string | null): Buffer | null {
        if (!base64Str) return null;
        try {
            const cleanBase64 = base64Str.replace(/^data:image\/\w+;base64,/, '');
            return Buffer.from(cleanBase64, 'base64');
        } catch {
            return null;
        }
    }

    public async generateDocx(dto: ExportCompensationDto): Promise<{ buffer: Buffer; filename: string }> {
        const templatePath = path.resolve(__dirname, './templates/compensation.docx');
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Không tìm thấy file mẫu tại: ${templatePath}`);
        }

        const templateBuffer = fs.readFileSync(templatePath);
        const createdAt = new Date(dto.created_at || Date.now());
        const formattedAmount = new Intl.NumberFormat('vi-VN').format(dto.compensation_amount) + ' VNĐ';

        const customerSigBuffer = ExportCompensationService.base64ToBuffer(dto.customer_signature);
        const adminSigBuffer = ExportCompensationService.base64ToBuffer(dto.admin_signature);
        const transferImgBuffer = ExportCompensationService.base64ToBuffer(dto.transfer_image);

        const renderedReport = await createReport({
            template: templateBuffer,
            cmdDelimiter: ['{', '}'],
            data: {
                day: String(createdAt.getDate()).padStart(2, '0'),
                month: String(createdAt.getMonth() + 1).padStart(2, '0'),
                year: createdAt.getFullYear(),
                branch_info: dto.branch_info,
                customer_fullname: dto.customer_info.fullname,
                customer_phone: dto.customer_info.phone,
                customer_email: dto.customer_info.email,
                compensation_amount: formattedAmount,

                customer_signature: customerSigBuffer
                    ? { width: 4, height: 2, data: customerSigBuffer, extension: '.png' }
                    : '',
                admin_signature: adminSigBuffer
                    ? { width: 4, height: 2, data: adminSigBuffer, extension: '.png' }
                    : '',
                transfer_image: transferImgBuffer
                    ? { width: 8, height: 12, data: transferImgBuffer, extension: '.png' }
                    : '',
            },
        });

        return {
            buffer: Buffer.from(renderedReport),
            filename: `Ban_Cam_Ket_Boi_Thuong_${Date.now()}.docx`,
        };
    }
}
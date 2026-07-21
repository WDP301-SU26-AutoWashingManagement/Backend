import { Request, Response } from 'express';
import { ExportCompensationService } from './export-compensation.service';
import { ExportCompensationDto } from './export-compensation.dto';

export class ExportCompensationController {
    private service: ExportCompensationService;

    constructor() {
        this.service = new ExportCompensationService();
    }

    public exportCompensationDocx = async (req: Request, res: Response): Promise<void> => {
        try {
            const dto = new ExportCompensationDto(req.body);
            const validation = dto.validate();

            if (!validation.isValid) {
                res.status(400).json({ success: false, message: validation.message });
                return;
            }

            const { buffer, filename } = await this.service.generateDocx(dto);

            res.set({
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': buffer.length,
            });

            res.send(buffer);
        } catch (error: any) {
            console.error('[Export Compensation Error]:', error);
            res.status(500).json({ success: false, message: error.message || 'Lỗi xuất file Word' });
        }
    };
}

export const exportCompensationController = new ExportCompensationController()
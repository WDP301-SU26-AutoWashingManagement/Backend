import { Request, Response, NextFunction } from 'express';
import { vehicleClassService } from '../services/vehicleClass.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../../common/utils/apiResponse';

export class VehicleClassController {
    private readonly service = vehicleClassService;

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.service.create(req.body);
            return sendCreated(res, data, 'Loại kích cỡ xe đã được tạo');
        } catch (error) {
            next(error);
        }
    };

    getAll = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const page  = parseInt(req.query.page  as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const data = await this.service.paginate(
                {},
                { page, limit, sort: { created_at: -1 } },
            );

            return sendPaginated(res, {
                docs:       data.docs,
                totalDocs:  data.totalDocs,
                limit:      data.limit,
                page:       data.page || 1,
                totalPages: data.totalPages,
            }, 'Danh sách các kích cỡ xe đã được cập nhật');
        } catch (error) {
            next(error);
        }
    };

    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.service.findById(req.params.id);
            return sendSuccess(res, data, 'Kích cỡ xe đã được cập nhật');
        } catch (error) {
            next(error);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.service.updateById(req.params.id, req.body);
            return sendSuccess(res, data, 'Thông tin kích cỡ xe đã được cập nhật');
        } catch (error) {
        next(error);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.service.deleteById(req.params.id);
            return sendSuccess(res, null, 'Thông tin kích cỡ xe đã được xóa');
        } catch (error) {
        next(error);
        }
    };

}

export const vehicleClassController = new VehicleClassController();
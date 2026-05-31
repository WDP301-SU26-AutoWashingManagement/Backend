import { Response, NextFunction } from 'express';
import { serviceService } from '../services/service.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../../common/utils/apiResponse';
import { sendPaginated } from '../../../common/utils/paginated.helper';
import { AuthenticatedRequest } from '../../../common/types';

class ServiceController {
    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const result = await serviceService.createService(req.body, req.user.id);
            sendCreated(res, result.service, 'Service created successfully');
        } catch (err) {
            next(err);
        }
    };

    getList = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const result = await serviceService.getServiceList(req.query);
            sendPaginated(res, result, 'Services fetched successfully');
        } catch (err) {
            next(err);
        }
    };

    getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { service } = await serviceService.getServiceById(req.params.id);
            sendSuccess(res, service, 'Service fetched successfully');
        } catch (err) {
            next(err);
        }
    };

    update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { service } = await serviceService.updateService(
                req.params.id,
                req.body,
            );
            sendSuccess(res, service, 'Service updated successfully');
        } catch (err) {
            next(err);
        }
    };

    toggleActive = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { service } = await serviceService.toggleActive(
                req.params.id,
                req.body,
            );
            sendSuccess(
                res,
                service,
                `Service ${req.body.is_active ? 'activated' : 'deactivated'} successfully`,
            );
        } catch (err) {
            next(err);
        }
    };

    remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            await serviceService.deleteService(req.params.id);
            sendNoContent(res);
        } catch (err) {
            next(err);
        }
    };
}

// Singleton instance — không new ở nơi khác
export const serviceController = new ServiceController();
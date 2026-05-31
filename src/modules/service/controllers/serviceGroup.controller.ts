import { Response, NextFunction } from 'express';
import { sendSuccess, sendCreated, sendNoContent } from '../../../common/utils/apiResponse';
import { sendPaginated } from '../../../common/utils/paginated.helper';
import { AuthenticatedRequest } from '../../../common/types';
import { serviceGroupService } from '../services/serviceGroup.service';

class ServiceGroupController {
    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const result = await serviceGroupService.createServiceGroup(req.body, req.user.id);
            sendCreated(res, result.serviceGroup, 'Nhóm dịch vụ đã được tạo');
        } catch (err) {
            next(err);
        }
    };

    getList = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const result = await serviceGroupService.getServiceGroupList(req.query);
            sendPaginated(res, result, 'Services fetched successfully');
        } catch (err) {
            next(err);
        }
    };

    getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { serviceGroup } = await serviceGroupService.getServiceGroupById(req.params.id);
            sendSuccess(res, serviceGroup, 'Nhóm dịch vụ đã được truy xuất thành công');
        } catch (err) {
            next(err);
        }
    };

    update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { group } = await serviceGroupService.updateServiceGroup(
                req.params.id,
                req.body,
            );
            sendSuccess(res, group, 'Service updated successfully');
        } catch (err) {
            next(err);
        }
    };

    toggleActive = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { group } = await serviceGroupService.toggleActive(
                req.params.id,
                req.body,
            );
            sendSuccess(
                res,
                group,
                `Service group ${req.body.is_active ? 'activated' : 'deactivated'} successfully`,
            );
        } catch (err) {
            next(err);
        }
    };

    remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            await serviceGroupService.deleteServiceGroup(req.params.id);
            sendNoContent(res);
        } catch (err) {
            next(err);
        }
    };
}

// Singleton instance — không new ở nơi khác
export const serviceGroupController = new ServiceGroupController();
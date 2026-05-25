import { Response, NextFunction } from 'express';
import { servicePackageService } from '../services/service-package.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../../common/utils/apiResponse';
import { sendPaginated } from '../../../common/utils/paginated.helper';
import { AuthenticatedRequest } from '../../../common/types';

class ServicePackageController {
    // ─────────────────────────────────────────────
    // POST /service-packages
    // ─────────────────────────────────────────────
    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const result = await servicePackageService.createServicePackage(req.body);
            sendCreated(res, result.servicePackage, 'Service package created successfully');
        } catch (err) {
            next(err);
        }
    };

    // ─────────────────────────────────────────────
    // GET /service-packages
    // ─────────────────────────────────────────────
    getList = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const result = await servicePackageService.getServicePackageList(req.query);
            sendPaginated(res, result, 'Service packages fetched successfully');
        } catch (err) {
            next(err);
        }
    };

    // ─────────────────────────────────────────────
    // GET /service-packages/:id
    // ─────────────────────────────────────────────
    getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { servicePackage } = await servicePackageService.getServicePackageById(req.params.id);
            sendSuccess(res, servicePackage, 'Service package fetched successfully');
        } catch (err) {
            next(err);
        }
    };

    // ─────────────────────────────────────────────
    // PATCH /service-packages/:id
    // ─────────────────────────────────────────────
    update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { servicePackage } = await servicePackageService.updateServicePackage(
                req.params.id,
                req.body,
            );
            sendSuccess(res, servicePackage, 'Service package updated successfully');
        } catch (err) {
            next(err);
        }
    };

    // ─────────────────────────────────────────────
    // PATCH /service-packages/:id/toggle-active
    // ─────────────────────────────────────────────
    toggleActive = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { servicePackage } = await servicePackageService.toggleActive(
                req.params.id,
                req.body,
            );
            sendSuccess(
                res,
                servicePackage,
                `Service package ${req.body.is_active ? 'activated' : 'deactivated'} successfully`,
            );
        } catch (err) {
            next(err);
        }
    };

    // ─────────────────────────────────────────────
    // DELETE /service-packages/:id
    // ─────────────────────────────────────────────
    remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            await servicePackageService.deleteServicePackage(req.params.id);
            sendNoContent(res);
        } catch (err) {
            next(err);
        }
    };
}

// Singleton instance — không new ở nơi khác
export const servicePackageController = new ServicePackageController();
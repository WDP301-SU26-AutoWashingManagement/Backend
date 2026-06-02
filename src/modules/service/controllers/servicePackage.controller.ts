import { Response, NextFunction } from 'express';
import {
    sendSuccess,
    sendCreated,
    sendNoContent,
} from '../../../common/utils/apiResponse';
import { sendPaginated } from '../../../common/utils/paginated.helper';
import { AuthenticatedRequest } from '../../../common/types';
import { servicePackageService } from '../services/servicePackage.service';

class ServicePackageController {
    create = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const result =
                await servicePackageService.createServicePackage(
                    req.body,
                );

            sendCreated(
                res,
                result.servicePackage,
                'Gói dịch vụ đã được tạo thành công',
            );
        } catch (err) {
            next(err);
        }
    };

    getList = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const result =
                await servicePackageService.getServicePackageList(
                    req.query,
                );

            sendPaginated(
                res,
                result,
                'Lấy danh sách gói dịch vụ thành công',
            );
        } catch (err) {
            next(err);
        }
    };

    getById = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const { servicePackage } =
                await servicePackageService.getServicePackageById(
                    req.params.id,
                );

            sendSuccess(
                res,
                servicePackage,
                'Lấy thông tin gói dịch vụ thành công',
            );
        } catch (err) {
            next(err);
        }
    };

    update = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const { servicePackage } =
                await servicePackageService.updateServicePackage(
                    req.params.id,
                    req.body,
                );

            sendSuccess(
                res,
                servicePackage,
                'Cập nhật gói dịch vụ thành công',
            );
        } catch (err) {
            next(err);
        }
    };

    toggleActive = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const { servicePackage } =
                await servicePackageService.toggleActive(
                    req.params.id,
                    req.body,
                );

            sendSuccess(
                res,
                servicePackage,
                `Gói dịch vụ đã được ${
                    req.body.is_active ? 'kích hoạt' : 'vô hiệu hóa'
                } thành công`,
            );
        } catch (err) {
            next(err);
        }
    };

    remove = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            await servicePackageService.deleteServicePackage(
                req.params.id,
            );

            sendNoContent(res);
        } catch (err) {
            next(err);
        }
    };

    listServices = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const services =
                await servicePackageService.listAllServiceByPackageId(
                    req.params.id,
                );

            sendSuccess(
                res,
                services,
                'Lấy danh sách dịch vụ trong gói thành công',
            );
        } catch (err) {
            next(err);
        }
    };
}

export const servicePackageController =
    new ServicePackageController();
import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customer.service';
import { sendSuccess } from '../../../common/utils/apiResponse';
import { AuthenticatedRequest } from '../../../common/types';

export class CustomerController {
    private readonly service = CustomerService
     async getProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const customerId = (req as AuthenticatedRequest).user.id;
            const profile = await this.service.getProfile(customerId);
            sendSuccess(res, profile, 'Profile fetched successfully');
        } catch (error) {
            next(error);
        }
    }

     async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const customerId = (req as AuthenticatedRequest).user.id;
            const updatedProfile = await CustomerService.updateProfile(customerId, req.body);
            sendSuccess(res, updatedProfile, 'Profile updated successfully');
        } catch (error) {
            next(error);
        }
    }

     async changePassword(req: Request, res: Response, next: NextFunction) {
        try {
            const customerId = (req as AuthenticatedRequest).user.id;
            const result = await CustomerService.changePassword(customerId, req.body);
            sendSuccess(res, result, result.message);
        } catch (error) {
            next(error);
        }
    }
}
export const customerController = new CustomerController()
import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { sendSuccess } from '../../../common/utils/apiResponse';

export class AdminController {
	static async createAdmin(req: Request, res: Response, next: NextFunction) {
		try {
			const data = await AdminService.createAdmin(req.body);
			sendSuccess(res, data, 'Admin created successfully', 201);
		} catch (error) {
			next(error);
		}
	}
}


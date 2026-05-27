import { Request, Response, NextFunction } from 'express';
import { vehicleService, VehicleService } from '../services/vehicle.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../../common/utils/apiResponse';
import { AuthenticatedRequest } from '@common/types';

export class VehicleController {
  private service = vehicleService;

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.create(req.body);
      return sendCreated(res, data, 'Vehicle created successfully');
    } catch (error) {
      next(error);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction) => {
      try {
          const page  = parseInt(req.query.page  as string) || 1;
          const limit = parseInt(req.query.limit as string) || 10;

          const data = await this.service.paginate(
              { customer_id: (req as AuthenticatedRequest).user.id },
              { page, limit, sort: { created_at: -1 } },
          );

          return sendPaginated(res, {
              docs:       data.docs,
              totalDocs:  data.totalDocs,
              limit:      data.limit,
              page:       data.page || 1,
              totalPages: data.totalPages,
          }, 'Vehicles retrieved successfully');
      } catch (error) {
          next(error);
      }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.findById(req.params.id);
      return sendSuccess(res, data, 'Vehicle retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.updateById(req.params.id, req.body);
      return sendSuccess(res, data, 'Vehicle updated successfully');
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteById(req.params.id);
      return sendSuccess(res, null, 'Vehicle deleted successfully');
    } catch (error) {
      next(error);
    }
  };
}

export const vehicleController = new VehicleController();
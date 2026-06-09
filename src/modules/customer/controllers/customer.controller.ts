import { Response, NextFunction } from 'express';
import { customerService } from '../services/customer.service';
import { sendCreated, sendSuccess, sendNoContent } from '../../../common/utils/apiResponse';
import { sendPaginated as sendPaginatedHelper } from '../../../common/utils/paginated.helper';
import { AuthenticatedRequest } from '../../../common/types';
import { ICreateCustomer, IGetCustomerList, IUpdateCustomer } from '../interfaces/customer.interface';

export class CustomerController {
  private readonly customerService = customerService;

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const customer = await this.customerService.createCustomer(req.body as ICreateCustomer);
      sendCreated(res, customer, 'Customer created successfully');
    } catch (err) {
      next(err);
    }
  };

  getList = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.customerService.getCustomerList(req.query as unknown as IGetCustomerList);
      sendPaginatedHelper(res, result, 'Customers fetched successfully');
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const customer = await this.customerService.getCustomerById(req.params.id);
      sendSuccess(res, customer, 'Customer fetched successfully');
    } catch (err) {
      next(err);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const customer = await this.customerService.updateCustomer(req.params.id, req.body as IUpdateCustomer);
      sendSuccess(res, customer, 'Customer updated successfully');
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await this.customerService.deleteCustomer(req.params.id);
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  };
}

export const customerController = new CustomerController();

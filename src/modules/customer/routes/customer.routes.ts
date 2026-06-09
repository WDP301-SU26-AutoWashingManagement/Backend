import { Router } from 'express';
import { customerController } from '../controllers/customer.controller';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { validate } from '../../../common/middleware/validate.middleware';
import { UserRole } from '../../../common/types/enum';
import { createCustomerSchema, updateCustomerSchema, getCustomerListSchema } from '../dtos/customer.dto';

const router = Router();
const controller = customerController;

// Protected routes
router.use(authenticate);

// List/Get Customers (Admin, Boss, Staff)
router.get(
  '/', 
  authorize(UserRole.ADMIN, UserRole.BOSS, UserRole.STAFF), 
  validate(getCustomerListSchema, 'query'), 
  controller.getList
);

router.get(
  '/:id', 
  authorize(UserRole.ADMIN, UserRole.BOSS, UserRole.STAFF), 
  controller.getById
);

// Manage Customers (Admin, Boss only)
router.post(
  '/', 
  authorize(UserRole.ADMIN, UserRole.BOSS), 
  validate(createCustomerSchema, 'body'), 
  controller.create
);

router.patch(
  '/:id', 
  authorize(UserRole.ADMIN, UserRole.BOSS), 
  validate(updateCustomerSchema, 'body'), 
  controller.update
);

router.delete(
  '/:id', 
  authorize(UserRole.ADMIN, UserRole.BOSS), 
  controller.remove
);

router.get(
  '/membership',
  authorize(UserRole.CUSTOMER),
  controller.getMembershipPoint
)

export default router;

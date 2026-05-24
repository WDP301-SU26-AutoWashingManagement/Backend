import { Router, Request, Response, NextFunction } from 'express';
import { userProfileController } from '../controllers/userProfile.controller';
import { authenticate }          from '../../../common/middleware/auth.middleware';
import { validate }              from '../../../common/middleware/validate.middleware';
import { changePasswordSchema,
         updateProfileCustomerSchema,
         updateProfileStaffSchema,
         updateProfileManagerSchema,
         updateProfileAdminSchema } from '../dtos/userProfile.dto';
import { AuthenticatedRequest }  from '../../../common/types';
import { UserRole }              from '@common/types';
import Joi                       from 'joi';
import { upload } from '@common/utils/imageFile';

const router = Router();

const UPDATE_SCHEMA_BY_ROLE: Record<UserRole, Joi.ObjectSchema> = {
  customer: updateProfileCustomerSchema,
  staff:    updateProfileStaffSchema,
  manager:  updateProfileManagerSchema,
  admin:    updateProfileAdminSchema,
};

function validateUpdateProfile(req: Request, res: Response, next: NextFunction) {
  const role  = (req as AuthenticatedRequest).user.role as UserRole;
  const schema = UPDATE_SCHEMA_BY_ROLE[role] ?? updateProfileCustomerSchema;
  return validate(schema, 'body')(req, res, next);
}

router.use(authenticate);

router.get(
  '/profile',
  userProfileController.getProfile.bind(userProfileController),
);

router.put(
  '/profile',
  validateUpdateProfile,
  upload.single('avatar'),
  userProfileController.updateProfile.bind(userProfileController),
);

router.patch(
  '/profile/password',
  validate(changePasswordSchema, 'body'),
  userProfileController.changePassword.bind(userProfileController),
);

export default router;

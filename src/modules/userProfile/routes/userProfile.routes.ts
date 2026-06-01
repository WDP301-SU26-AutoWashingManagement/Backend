import { Router } from 'express';

import { userProfileController } from '../controllers/userProfile.controller';

import { authenticate } from '../../../common/middleware/auth.middleware';
import { validate } from '../../../common/middleware/validate.middleware';

import {
  changePasswordSchema,
  updateProfileSchema,
} from '../dtos/userProfile.dto';

import { upload } from '@common/utils/imageFile';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  userProfileController.getProfile.bind(userProfileController),
);

router.put(
  '/',
  upload.single('avatar'),
  validate(updateProfileSchema, 'body'),
  userProfileController.updateProfile.bind(userProfileController),
);

router.patch(
  '/password',
  validate(changePasswordSchema, 'body'),
  userProfileController.changePassword.bind(userProfileController),
);

export default router;
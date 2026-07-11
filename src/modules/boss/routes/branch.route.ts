import { Router } from 'express';

import { branchController } from '../controllers/branch.controller';

import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { validate } from '../../../common/middleware/validate.middleware';

import {
  createBranchSchema,
  updateBranchSchema,
} from '../dtos/branch.dto';
import { UserRole } from '@common/types/enum';


const router = Router();

router.get(
    "/",
    branchController.getBranches,
);

router.get(
    "/public-stats",
    branchController.getPublicStats,
);

router.get(
    "/:id",
    branchController.getBranch,
);

router.post(
    "/",
    authenticate,
    authorize(UserRole.BOSS),
    validate(createBranchSchema),
    branchController.createBranch,
);

router.patch(
    "/:id",
    authenticate,
    authorize(UserRole.BOSS),
    branchController.updateBranch,
);

router.delete(
    "/:id",
    authenticate,
    authorize(UserRole.BOSS),
    branchController.deleteBranch,
);

router.patch(
    "/:id/activate",
    authenticate,
    authorize(UserRole.BOSS),
    branchController.activateBranch,
);
export default router;
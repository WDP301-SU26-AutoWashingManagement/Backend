import { Router } from 'express';
import { tierController } from '../controllers/tier.controller';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { UserRole } from '../../../common/types/enum';

const router = Router();
const controller = tierController;

// Public routes
router.get('/', controller.getList);

// Protected routes
router.use(authenticate);

// Admin only
router.post('/', authorize(UserRole.ADMIN), controller.create);
router.get('/:id', authorize(UserRole.ADMIN, UserRole.BOSS), controller.getById);
router.patch('/:id', authorize(UserRole.ADMIN), controller.update);
router.delete('/:id', authorize(UserRole.ADMIN), controller.remove);

export default router;


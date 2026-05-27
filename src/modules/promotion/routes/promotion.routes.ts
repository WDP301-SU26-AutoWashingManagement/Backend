import { Router } from 'express';
import { promotionController } from '../controllers/promotion.controller';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { UserRole } from '@common/types';
import { promotionValidateLimiter } from '../../../configs/rateLimit.config';

const router     = Router();
const controller = promotionController

// ─── Public ───────────────────────────────────────────────────────────────────
// Validate promotion code (customer dùng trước khi đặt lịch)
// Phải đăng ký trước /:id để không bị shadow
router.get('/validate/:code', promotionValidateLimiter, controller.validateCode);

// ─── Protected ────────────────────────────────────────────────────────────────
// router.use(authenticate);

// ─── Admin only ───────────────────────────────────────────────────────────────
router.post('/', authenticate, authorize(UserRole.ADMIN), controller.create);
router.get('/', controller.getList);
router.get('/:id', controller.getById);
router.patch('/:id', authenticate, authorize(UserRole.ADMIN), controller.update);
router.patch('/:id/toggle-active', authenticate, authorize(UserRole.ADMIN), controller.toggleActive);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), controller.remove);

export default router;

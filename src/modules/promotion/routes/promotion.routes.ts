import { Router } from 'express';
import { promotionController } from '../controllers/promotion.controller';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { UserRole } from '@common/types';

const router     = Router();
const controller = promotionController

// ─── Public ───────────────────────────────────────────────────────────────────
// Validate promotion code (customer dùng trước khi đặt lịch)
// Phải đăng ký trước /:id để không bị shadow
router.get('/validate/:code', controller.validateCode);

// ─── Protected ────────────────────────────────────────────────────────────────
router.use(authenticate);

// ─── Admin only ───────────────────────────────────────────────────────────────
router.post('/', authorize(UserRole.ADMIN), controller.create);
router.get('/', authorize(UserRole.ADMIN), controller.getList);
router.get('/:id', authorize(UserRole.ADMIN), controller.getById);
router.patch('/:id', authorize(UserRole.ADMIN), controller.update);
router.patch('/:id/toggle-active', authorize(UserRole.ADMIN), controller.toggleActive);
router.delete('/:id', authorize(UserRole.ADMIN), controller.remove);

export default router;

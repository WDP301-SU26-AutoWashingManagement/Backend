import { Router } from 'express';
import { PromotionController } from '../controllers/promotion.controller';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';

const router     = Router();
const controller = new PromotionController();

// ─── Public ───────────────────────────────────────────────────────────────────
// Validate promotion code (customer dùng trước khi đặt lịch)
// Phải đăng ký trước /:id để không bị shadow
router.get('/validate/:code', controller.validateCode);

// ─── Protected ────────────────────────────────────────────────────────────────
router.use(authenticate);

// ─── Admin only ───────────────────────────────────────────────────────────────
router.post('/', authorize('admin'), controller.create);
router.get('/', authorize('admin'), controller.getList);
router.get('/:id', authorize('admin'), controller.getById);
router.patch('/:id', authorize('admin'), controller.update);
router.patch('/:id/toggle-active', authorize('admin'), controller.toggleActive);
router.delete('/:id', authorize('admin'), controller.remove);

export default router;

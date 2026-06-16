import { Router } from 'express';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { validate } from '../../../common/middleware/validate.middleware';
import { UserRole } from '../../../common/types/enum';
import { promotionController } from '../controllers/promotion.controller';
import { createPromotionSchema, getDiscountSchema, updatePromotionSchema } from '../dtos/promotion.dto';

const router = Router();
const controller = promotionController;

// Protected routes
// router.use(authenticate);

router.post('/', authenticate, authorize(UserRole.BOSS), validate(createPromotionSchema), controller.create);
router.get('/', controller.getList);
router.post('/discount', validate(getDiscountSchema), controller.getDiscount);
router.get('/:id', controller.getById);
router.patch('/:id', authenticate, authorize(UserRole.BOSS), validate(updatePromotionSchema), controller.update);
router.delete('/:id', authenticate, authorize(UserRole.BOSS), controller.remove);

export default router;

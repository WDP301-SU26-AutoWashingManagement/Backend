import { Router } from 'express';
import { recommendationController } from '../controllers/recommendation.controller';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { validate } from '../../../common/middleware/validate.middleware';
import { UserRole } from '../../../common/types/enum';
import { getBookingRecommendationSchema } from '../dtos/recommendation.dto';

const router = Router();

router.use(authenticate);

/**
 * GET /bookings/recommendation?vehicle_id=...&branch_id=...
 * "Auto-Pilot Booking" — trả về gợi ý gói/dịch vụ + khung giờ phù hợp nhất,
 * sẵn sàng để FE pre-fill thẳng vào form tạo booking (POST /bookings).
 * Chỉ CUSTOMER được gọi (đây là gợi ý cho chính khách hàng đang đăng nhập).
 */
router.get(
  '/',
  authorize(UserRole.CUSTOMER),
  validate(getBookingRecommendationSchema, 'query'),
  recommendationController.getBookingRecommendation,
);

export default router;

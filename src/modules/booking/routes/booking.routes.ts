import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { UserRole } from '../../../common/types';

const router = Router();
const controller = new BookingController();

// Tất cả các route bên dưới bắt buộc phải đăng nhập
router.use(authenticate);

/**
 * ROUTES CHO CUSTOMER (Khách hàng)
 */
// Tạo lịch đăng ký rửa xe
router.post('/', authorize('customer'), controller.create);

// Hủy lịch hẹn (Khách hàng chỉ hủy lịch của họ)
router.patch('/:id/cancel', authorize('customer'), controller.cancel);


/**
 * ROUTES CHO Người quản lý lịch hẹn
 */
// Xác nhận lịch hẹn (chuyển từ pending -> confirmed)
router.patch('/:id/confirm', authorize('admin'), controller.confirm);

// Check-in
// Check-in khi xe đến (Trường hợp nhập thủ công) - update bookingStatus by checked_in
router.patch('/:id/check-in', authorize('admin'), controller.checkIn);
// Check-in bằng biển số (Dùng cho trường hợp quét biển số tại cổng vào) - update bookingStatus by checked_in
router.post('/check-in-by-plate', authorize('admin'), controller.checkInByPlate);

// Cập nhật trạng thái đang rửa (in_progress) - update bookingStatus by in_progress
router.patch('/:id/start-washing', authorize('admin'), controller.startWashing);

// Hoàn thành và tính membership + reward points (completed) - update bookingStatus by completed
router.patch('/:id/complete', authorize('admin'), controller.complete);




/**
 * SHARED ROUTES (Dùng chung)
 */
// Xem lịch sử (Logic lọc theo role đã viết trong controller)
router.get('/history', authorize('admin', 'customer'), controller.getHistory);

// Xem chi tiết một bản ghi booking (chỉ admin và khách hàng có thể xem chi tiết lịch hẹn của chính họ)
router.get('/:id', authorize('admin', 'customer'), controller.getById);


export default router;
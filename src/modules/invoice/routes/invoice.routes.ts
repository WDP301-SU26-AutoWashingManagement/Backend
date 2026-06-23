import { Router } from 'express';
import { invoiceController } from '../controller/invoice.controller';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { UserRole } from '../../../common/types/enum';

const router = Router();
const ctrl   = invoiceController;

// ── Webhook – KHÔNG cần auth (PayOS gọi trực tiếp) ──────────────────────────
router.post('/webhook', ctrl.webhook);

// ── Các route cần đăng nhập ──────────────────────────────────────────────────
router.use(authenticate);

// Tạo invoice draft từ appointment
router.post('/', authorize(UserRole.STAFF, UserRole.ADMIN), ctrl.createInvoice);

// Admin: xem toàn bộ danh sách
router.get('/', authorize(UserRole.ADMIN, UserRole.BOSS), ctrl.getList);

// Chi tiết invoice (customer xem của mình, admin xem tất cả)
router.get('/:id', ctrl.getById);

// Tạo link thanh toán PayOS từ invoice draft
router.post('/:id/payment-link', ctrl.createPaymentLink);

// Sync trạng thái từ PayOS
router.get('/:id/sync', ctrl.sync);

// Huỷ link PayOS
router.patch('/:id/cancel-payment', ctrl.cancelPayment);

// Staff/Admin: xác nhận thu tiền mặt
router.patch(
  '/:id/confirm-cash',
  authorize(UserRole.STAFF, UserRole.ADMIN),
  ctrl.confirmCash,
);

export default router;

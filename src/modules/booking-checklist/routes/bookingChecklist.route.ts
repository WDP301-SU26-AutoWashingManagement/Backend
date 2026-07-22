import { Router, Request, Response, NextFunction } from 'express';
import { bookingChecklistController } from '../controllers/bookingChecklist.controller';
import { uploadChecklistImages, uploadReportEvidence } from '../middlewares/upload.middleware';
import {
  createBookingChecklistDto,
  createBookingReportDto,
  updateBookingChecklistDto,
} from '../dtos/bookingChecklist.dto';
import { ValidationError } from '../../../common/utils/AppError';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { UserRole } from '../../../common/types/enum';

const router = Router();

// ─── Inline Joi validator ─────────────────────────────────────────────────────

function validate(schema: any) {
  return (req: Request, _res: Response, next: NextFunction) => {
    console.log('CONTENT-TYPE:', req.headers['content-type']);
    console.log('BODY:', req.body);
    console.log('FILES:', (req as any).files);
    const parseArrayField = (fieldName: string, errorMessage: string) => {
      if (typeof req.body[fieldName] === 'string') {
        try {
          req.body[fieldName] = JSON.parse(req.body[fieldName]);
        } catch {
          return next(new ValidationError(errorMessage));
        }
      }
    };

    // checklist_items có thể được gửi dưới dạng JSON string (multipart/form-data)
    parseArrayField('checklist_items', 'checklist_items phải là mảng JSON hợp lệ');

    const { error, value } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
    if (error) {
      const fields = error.details.map((d: any) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return next(new ValidationError('Dữ liệu không hợp lệ', fields));
    }
    req.body = value;
    next();
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.post(
  '/appointment/:appointmentId/report',
  authenticate,
  authorize(UserRole.CUSTOMER),
  uploadReportEvidence,
  validate(createBookingReportDto),
  bookingChecklistController.createReport,
);

router.patch(
  '/appointment/:appointmentId/report/accept',
  authenticate,
  authorize(UserRole.STAFF, UserRole.ADMIN),
  bookingChecklistController.acceptReport,
);

router.patch(
  '/appointment/:appointmentId/report/upload-bill',
  authenticate,
  authorize(UserRole.STAFF, UserRole.ADMIN),
  bookingChecklistController.uploadCompensationBill,
);

router.patch(
  '/appointment/:appointmentId/report/upload-qr',
  authenticate,
  authorize(UserRole.CUSTOMER, UserRole.STAFF, UserRole.ADMIN),
  bookingChecklistController.uploadCompensationQr,
);

router.patch(
  '/appointment/:appointmentId/report/customer-confirm',
  authenticate,
  authorize(UserRole.CUSTOMER),
  bookingChecklistController.customerConfirmCompensation,
);

router.patch(
  '/appointment/:appointmentId/report/reject',
  authenticate,
  authorize(UserRole.STAFF, UserRole.ADMIN),
  bookingChecklistController.rejectReport,
);

/**
 * GET /api/booking-checklists/reports
 * Danh sách report (phân trang). Query: page, limit, isConfirm
 * Phải đặt TRƯỚC GET /:id để không bị "reports" parse thành id
 */
router.get(
  '/reports',
  authenticate,
  authorize(UserRole.STAFF, UserRole.ADMIN),
  bookingChecklistController.getAllReports,
);

/**
 * DELETE /api/booking-checklists/appointment/:appointmentId/report
 * Chỉ xoá được khi report.isConfirm === true
 */
router.delete(
  '/appointment/:appointmentId/report',
  authenticate,
  authorize(UserRole.STAFF, UserRole.ADMIN),
  bookingChecklistController.deleteReport,
);

/**
 * POST /api/booking-checklists
 * Body (multipart/form-data):
 *   - appointment_id   string (required)
 *   - checklist_items  JSON string | array
 *   - note             string (optional)
 *   - customer_signature string (optional, base64 data URI)
 *   - images           file[] (optional, field name: "images")
 */
router.post(
  '/',
  uploadChecklistImages,
  validate(createBookingChecklistDto),
  bookingChecklistController.create,
);

/**
 * PUT /api/booking-checklists/:id
 * Body (multipart/form-data):
 *   - checklist_items  JSON string | array (optional)
 *   - note             string (optional)
 *   - customer_signature string (optional)
 *   - images           file[] (optional) — ảnh mới sẽ APPEND vào danh sách cũ
 */
router.put(
  '/:id',
  uploadChecklistImages,
  validate(updateBookingChecklistDto),
  bookingChecklistController.update,
);

/**
 * GET /api/booking-checklists/appointment/:appointmentId
 * Phải đặt TRƯỚC /:id để không bị "appointment" parse thành id
 */
router.get('/appointment/:appointmentId', bookingChecklistController.getByAppointmentId);

/**
 * GET /api/booking-checklists/:id/export-pdf
 * Phải đặt TRƯỚC /:id
 */
router.get('/:id/export-pdf', bookingChecklistController.exportPdf);

/**
 * GET /api/booking-checklists/:id
 */
router.get('/:id', bookingChecklistController.getById);

router.post('/test', (req, res) => {
  console.log(req.headers);
  res.json(req.headers);
});
router.post('/debug', (req, res) => {
  console.log('HEADERS=', req.headers);
  res.json(req.headers);
});
export default router;
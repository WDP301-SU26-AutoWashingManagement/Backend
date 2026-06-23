import { Router, Request, Response, NextFunction } from 'express';
import { bookingChecklistController } from '../controllers/bookingChecklist.controller';
import { uploadChecklistImages }      from '../middlewares/upload.middleware';
import {
  createBookingChecklistDto,
  updateBookingChecklistDto,
} from '../dtos/bookingChecklist.dto';
import { ValidationError } from '../../../common/utils/AppError';

const router = Router();

// ─── Inline Joi validator ─────────────────────────────────────────────────────

function validate(schema: any) {
  return (req: Request, _res: Response, next: NextFunction) => {
    console.log('CONTENT-TYPE:', req.headers['content-type']);
    console.log('BODY:', req.body);
    console.log('FILES:', (req as any).files);
    // checklist_items có thể được gửi dưới dạng JSON string (vì multipart/form-data)
    if (typeof req.body.checklist_items === 'string') {
      try {
        req.body.checklist_items = JSON.parse(req.body.checklist_items);
      } catch {
        return next(new ValidationError('checklist_items phải là mảng JSON hợp lệ'));
      }
    }

    const { error, value } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
    if (error) {
      const fields = error.details.map((d: any) => ({
        field  : d.path.join('.'),
        message: d.message,
      }));
      return next(new ValidationError('Dữ liệu không hợp lệ', fields));
    }
    req.body = value;
    next();
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

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

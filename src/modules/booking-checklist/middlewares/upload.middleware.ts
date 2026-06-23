import multer from 'multer';

// ─── Memory storage — không lưu disk, convert sang base64 ────────────────────

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES    = 5 * 1024 * 1024; // 5 MB

const checklistUpload = multer({
  storage: multer.memoryStorage(),
  limits : {
    fileSize: MAX_SIZE_BYTES,
    files   : 10,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      return cb(new Error('Chỉ chấp nhận file ảnh (jpeg, jpg, png, webp)'));
    }
    cb(null, true);
  },
});

/**
 * Middleware upload nhiều ảnh — field name: "images"
 * Convert buffer → base64 data URI và gán vào req.body.images
 */
export const uploadChecklistImages = [
  checklistUpload.array('images', 10),

  (req: any, _res: any, next: any) => {
    if (req.files && Array.isArray(req.files)) {
      req.body.images = (req.files as Express.Multer.File[]).map(
        (f) => `data:${f.mimetype};base64,${f.buffer.toString('base64')}`,
      );
    } else {
      req.body.images = req.body.images ?? [];
    }
    next();
  },
];
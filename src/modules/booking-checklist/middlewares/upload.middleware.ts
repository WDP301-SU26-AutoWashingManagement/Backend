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

const reportUpload = multer({
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

const toBase64DataUris = (files: Express.Multer.File[]) =>
  files.map((file) => `data:${file.mimetype};base64,${file.buffer.toString('base64')}`);

const uploadFileField = (upload: multer.Multer, fieldName: string, targetKey: string) => [
  upload.array(fieldName, 10),

  (req: any, _res: any, next: any) => {
    if (req.files && Array.isArray(req.files)) {
      req.body[targetKey] = toBase64DataUris(req.files as Express.Multer.File[]);
    } else {
      req.body[targetKey] = req.body[targetKey] ?? [];
    }
    next();
  },
];

/**
 * Middleware upload nhiều ảnh — field name: "images"
 * Convert buffer → base64 data URI và gán vào req.body.images
 */
export const uploadChecklistImages = [
  ...uploadFileField(checklistUpload, 'images', 'images'),
];

/**
 * Middleware upload evidence cho report — field name: "evidence" (file[])
 * Convert buffer → base64 data URI và gán vào req.body.evidence
 */
export const uploadReportEvidence = [
  ...uploadFileField(reportUpload, 'evidence', 'evidence'),
];
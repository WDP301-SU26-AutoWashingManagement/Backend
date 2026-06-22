import multer, { StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';

// ─── Ensure upload directory exists ──────────────────────────────────────────

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'checklists');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ─── Disk storage config ──────────────────────────────────────────────────────

const storage: StorageEngine = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext       = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, uniqueName);
  },
});

// ─── File filter ──────────────────────────────────────────────────────────────

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// ─── Multer instance ──────────────────────────────────────────────────────────

export const checklistUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files   : 10,               // max 10 images per request
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
 * Tự động lưu file vào /uploads/checklists và thêm đường dẫn vào req.body.images
 */
export const uploadChecklistImages = [
  checklistUpload.array('images', 10),

  (req: any, _res: any, next: any) => {

    console.log('========== AFTER MULTER ==========');
    console.log('BODY:', req.body);
    console.log('FILES:', req.files);

    if (req.files && Array.isArray(req.files)) {
      req.body.images = (req.files as Express.Multer.File[]).map(
        (f) => `/uploads/checklists/${f.filename}`,
      );
    } else {
      req.body.images = req.body.images ?? [];
    }

    next();
  },
];

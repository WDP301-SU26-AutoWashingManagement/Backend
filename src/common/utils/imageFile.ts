import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },

  fileFilter: (req, file, cb) => {

    const allowed = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp'
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(
        new Error('Only image files are allowed')
      );
    }

    cb(null, true);
  }
});
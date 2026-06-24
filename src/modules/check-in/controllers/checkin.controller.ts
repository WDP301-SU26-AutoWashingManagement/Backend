import { Request, Response } from 'express';
import { processCheckinFromImage } from '../services/checkin.service';

export async function checkinByCamera(req: Request, res: Response) {
  try {
    // Nhận file ảnh từ frontend (dùng multer)
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'Không có ảnh được gửi lên.' });
    }

    const result = await processCheckinFromImage(file.buffer, file.mimetype);

    return res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('[checkinByCamera] error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
}

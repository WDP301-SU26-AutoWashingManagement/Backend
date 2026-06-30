import { Router } from 'express';
import { checkinByCamera } from '../controllers/checkin.controller';
import { upload } from '@common/utils/imageFile';
const router = Router();

// POST /api/v1/checkin/camera
router.post('/camera', upload.single('file'), checkinByCamera);

export default router;

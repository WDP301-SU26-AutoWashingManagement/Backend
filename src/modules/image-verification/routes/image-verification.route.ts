import { Router } from 'express';
import { verificationController } from '../controllers/image-verification.controller';
import { upload } from '@common/utils/imageFile';

const router = Router();
const controller = verificationController;

router.post('/verify-image', upload.single('image'), controller.verifyWithSSE);

export default router;
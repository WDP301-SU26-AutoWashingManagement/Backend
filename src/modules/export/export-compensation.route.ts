import { Router } from 'express';
import { exportCompensationController } from './export-compensation.controller';

const router = Router();
const controller = exportCompensationController;

router.post('/compensation-docx', controller.exportCompensationDocx);

export default router;
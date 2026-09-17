import { Router } from 'express';
import {
  getCalibrationSessions,
  getCalibrationSessionById,
  createCalibrationSession,
  addMeasurement
} from '../../controllers/calibration.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize(['ADMIN', 'MANAGER'])); // Calibration is admin/manager only

router.get('/', getCalibrationSessions);
router.get('/:id', getCalibrationSessionById);
router.post('/', createCalibrationSession);
router.post('/:id/measurements', addMeasurement);

export default router;

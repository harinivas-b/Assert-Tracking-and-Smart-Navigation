import { Router } from 'express';
import {
  getAlerts,
  getAlertById,
  updateAlertStatus
} from '../../controllers/alert.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAlerts);
router.get('/:id', getAlertById);
router.put('/:id/status', authorize(['ADMIN', 'MANAGER']), updateAlertStatus);

export default router;

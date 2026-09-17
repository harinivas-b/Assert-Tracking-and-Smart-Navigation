import { Router } from 'express';
import {
  getTrackers,
  getTrackerById,
  createTracker,
  updateTracker,
  deleteTracker
} from '../../controllers/tracker.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getTrackers);
router.get('/:id', getTrackerById);
router.post('/', authorize(['ADMIN', 'MANAGER']), createTracker);
router.put('/:id', authorize(['ADMIN', 'MANAGER']), updateTracker);
router.delete('/:id', authorize(['ADMIN']), deleteTracker);

export default router;

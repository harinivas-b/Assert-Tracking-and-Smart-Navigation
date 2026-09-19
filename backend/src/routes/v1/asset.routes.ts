import { Router } from 'express';
import {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  assignTracker,
  unassignTracker
} from '../../controllers/asset.controller';
import { getLiveAssetReaders } from '../../controllers/assetLive.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/live', getLiveAssetReaders);
router.get('/', getAssets);
router.get('/:id', getAssetById);
router.post('/', authorize(['ADMIN', 'MANAGER']), createAsset);
router.put('/:id', authorize(['ADMIN', 'MANAGER']), updateAsset);
router.delete('/:id', authorize(['ADMIN']), deleteAsset);

// Assignments
router.post('/assign', authorize(['ADMIN', 'MANAGER']), assignTracker);
router.delete('/:assetId/assign', authorize(['ADMIN', 'MANAGER']), unassignTracker);

export default router;

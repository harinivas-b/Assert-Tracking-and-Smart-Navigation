import { Router } from 'express';
import {
  getBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  createRoom,
  updateRoom,
  deleteRoom
} from '../../controllers/locationHierarchy.controller';

const router = Router();

router.get('/buildings', getBuildings);
router.post('/buildings', createBuilding);
router.put('/buildings/:id', updateBuilding);
router.delete('/buildings/:id', deleteBuilding);

router.post('/rooms', createRoom);
router.put('/rooms/:id', updateRoom);
router.delete('/rooms/:id', deleteRoom);

export default router;

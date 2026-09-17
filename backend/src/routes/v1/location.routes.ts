import { Router } from 'express';
import {
  getOrganizations, createOrganization,
  getBuildings, createBuilding,
  getFloors, createFloor,
  getRooms, createRoom,
  getZones, createZone,
  getMovements
} from '../../controllers/location.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// Apply auth middleware to all routes here
router.use(authenticate);

// Organizations
router.get('/organizations', getOrganizations);
router.post('/organizations', authorize(['ADMIN']), createOrganization);

// Buildings
router.get('/buildings', getBuildings);
router.post('/buildings', authorize(['ADMIN']), createBuilding);

// Floors
router.get('/floors', getFloors);
router.post('/floors', authorize(['ADMIN', 'MANAGER']), createFloor);

// Rooms
router.get('/rooms', getRooms);
router.post('/rooms', authorize(['ADMIN', 'MANAGER']), createRoom);

// Zones
router.get('/zones', getZones);
router.post('/zones', authorize(['ADMIN', 'MANAGER']), createZone);

// Movements history
router.get('/movements', getMovements);

export default router;

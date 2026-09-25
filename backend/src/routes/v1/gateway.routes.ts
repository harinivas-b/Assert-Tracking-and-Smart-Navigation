import { Router } from 'express';
import {
  getGateways,
  getGatewayById,
  createGateway,
  updateGateway,
  deleteGateway,
  gatewayHeartbeat
} from '../../controllers/gateway.controller';

const router = Router();

router.get('/', getGateways);
router.get('/:id', getGatewayById);
router.post('/', createGateway);
router.put('/:id', updateGateway);
router.delete('/:id', deleteGateway);
router.post('/heartbeat', gatewayHeartbeat);

export default router;

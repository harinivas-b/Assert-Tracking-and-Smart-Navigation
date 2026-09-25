import { Router } from 'express';
import { getNodes, createNode, createEdge, calculateRoute } from '../../controllers/navigation.controller';

const router = Router();

router.get('/nodes', getNodes);
router.post('/nodes', createNode);
router.post('/edges', createEdge);
router.get('/route', calculateRoute);

export default router;

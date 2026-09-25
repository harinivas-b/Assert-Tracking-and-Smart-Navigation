import { Router } from 'express';
import { ingestObservations, subscribeDebugStream, getRecentObservations, syncThingSpeak } from '../../controllers/observation.controller';

const router = Router();

router.post('/ingest', ingestObservations);
router.get('/stream', subscribeDebugStream);
router.get('/recent', getRecentObservations);
router.post('/thingspeak-sync', syncThingSpeak);
router.get('/thingspeak-sync', syncThingSpeak);

export default router;

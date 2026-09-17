import { Router } from 'express';
import authRoutes from './auth.routes';
import locationRoutes from './location.routes';
import locationHierarchyRoutes from './locationHierarchy.routes';
import gatewayRoutes from './gateway.routes';
import trackerRoutes from './tracker.routes';
import assetRoutes from './asset.routes';
import observationRoutes from './observation.routes';
import alertRoutes from './alert.routes';
import ruleRoutes from './rule.routes';
import calibrationRoutes from './calibration.routes';
import navigationRoutes from './navigation.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/locations', locationRoutes);
router.use('/hierarchy', locationHierarchyRoutes);
router.use('/gateways', gatewayRoutes);
router.use('/trackers', trackerRoutes);
router.use('/assets', assetRoutes);
router.use('/observations', observationRoutes);
router.use('/alerts', alertRoutes);
router.use('/rules', ruleRoutes);
router.use('/calibrations', calibrationRoutes);
router.use('/navigation', navigationRoutes);

export default router;

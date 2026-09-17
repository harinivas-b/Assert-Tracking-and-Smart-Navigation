import { Router } from 'express';
import {
  getRules,
  createRule,
  deleteRule
} from '../../controllers/rule.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getRules);
router.post('/', authorize(['ADMIN', 'MANAGER']), createRule);
router.delete('/:id', authorize(['ADMIN', 'MANAGER']), deleteRule);

export default router;

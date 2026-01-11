import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { adminOnly } from '../middleware/rbac.js';
import { adminLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(authenticate, adminOnly, adminLimiter);

router.get('/config', adminController.getConfig);
router.put('/config', adminController.updateConfig);
router.put('/fx-source', adminController.updateFxSource);
router.put('/fee-rules', adminController.updateFeeRules);
router.post('/refresh-rates', adminController.refreshRates);
router.get('/stats', adminController.getSystemStats);

export default router;

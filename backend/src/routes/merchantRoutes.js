import express from 'express';
import * as merchantController from '../controllers/merchantController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole, managerOrAdmin } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', authenticate, managerOrAdmin, merchantController.listMerchants);
router.post('/', authenticate, merchantController.createMerchant);
router.get('/:id', authenticate, merchantController.getMerchant);
router.put('/:id', authenticate, merchantController.updateMerchant);
router.put('/:id/approve', authenticate, managerOrAdmin, merchantController.approveMerchant);
router.get('/:id/analytics', authenticate, merchantController.getMerchantAnalytics);

export default router;

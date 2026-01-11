import express from 'express';
import * as settlementController from '../controllers/settlementController.js';
import { authenticate } from '../middleware/auth.js';
import { managerOrAdmin } from '../middleware/rbac.js';

const router = express.Router();

router.get('/report', authenticate, managerOrAdmin, settlementController.getReconciliationReport);
router.get('/', authenticate, settlementController.listSettlements);
router.post('/batch', authenticate, managerOrAdmin, settlementController.createBatch);
router.get('/:id', authenticate, settlementController.getSettlement);
router.post('/:id/process', authenticate, managerOrAdmin, settlementController.processSettlement);
router.post('/:id/reconcile', authenticate, managerOrAdmin, settlementController.reconcileSettlement);

export default router;

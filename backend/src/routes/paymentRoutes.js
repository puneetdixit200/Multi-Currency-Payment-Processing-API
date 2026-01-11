import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, requireRoleOrOwner } from '../middleware/rbac.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';
import { optionalIdempotencyKey } from '../middleware/idempotency.js';

const router = express.Router();

router.get('/analytics', authenticate, paymentController.getAnalytics);
router.get('/', authenticate, paymentController.listPayments);
router.get('/:id', authenticate, paymentController.getPayment);
router.post('/', authenticate, paymentLimiter, optionalIdempotencyKey, paymentController.createPayment);
router.post('/:id/execute', authenticate, paymentController.executePayment);
router.post('/:id/refund', authenticate, requireRoleOrOwner(['admin', 'manager'], 'payment'), paymentController.refundPayment);

export default router;

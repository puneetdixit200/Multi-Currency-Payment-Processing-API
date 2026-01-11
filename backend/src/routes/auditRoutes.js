import express from 'express';
import * as auditController from '../controllers/auditController.js';
import { authenticate } from '../middleware/auth.js';
import { managerOrAdmin } from '../middleware/rbac.js';

const router = express.Router();

router.get('/compliance-report', authenticate, managerOrAdmin, auditController.getComplianceReport);
router.get('/', authenticate, managerOrAdmin, auditController.listAuditLogs);
router.get('/:id', authenticate, managerOrAdmin, auditController.getAuditLog);

export default router;

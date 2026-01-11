import { asyncHandler, NotFoundError } from '../middleware/errorHandler.js';
import * as AuditService from '../services/AuditService.js';

// GET /api/v1/audit-logs
export const listAuditLogs = asyncHandler(async (req, res) => {
  const filters = {
    category: req.query.category,
    action: req.query.action,
    userId: req.query.userId,
    resourceType: req.query.resourceType,
    resourceId: req.query.resourceId,
    severity: req.query.severity,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    search: req.query.search
  };
  
  const result = await AuditService.searchAuditLogs(filters, {
    page: req.query.page,
    limit: req.query.limit
  });
  
  res.json(result);
});

// GET /api/v1/audit-logs/:id
export const getAuditLog = asyncHandler(async (req, res) => {
  const log = await AuditService.getAuditLog(req.params.id);
  if (!log) throw new NotFoundError('Audit log');
  res.json({ log });
});

// GET /api/v1/audit-logs/compliance-report
export const getComplianceReport = asyncHandler(async (req, res) => {
  const report = await AuditService.getComplianceReport({
    startDate: req.query.startDate,
    endDate: req.query.endDate
  });
  res.json({ report });
});

export default { listAuditLogs, getAuditLog, getComplianceReport };

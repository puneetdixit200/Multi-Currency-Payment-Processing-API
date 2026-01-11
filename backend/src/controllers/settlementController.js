import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import * as SettlementService from '../services/SettlementService.js';

// POST /api/v1/settlements/batch
export const createBatch = asyncHandler(async (req, res) => {
  const merchantId = req.body.merchantId;
  if (!merchantId) throw new ValidationError('merchantId required');
  
  const settlement = await SettlementService.createSettlementBatch(merchantId, {
    startDate: req.body.startDate,
    endDate: req.body.endDate
  }, { userId: req.user._id, email: req.user.email, role: req.user.role });
  
  res.status(201).json({ message: 'Settlement batch created', settlement });
});

// POST /api/v1/settlements/:id/process
export const processSettlement = asyncHandler(async (req, res) => {
  const settlement = await SettlementService.processSettlement(req.params.id, {
    userId: req.user._id,
    role: req.user.role
  });
  if (!settlement) throw new NotFoundError('Settlement');
  res.json({ message: 'Settlement processing initiated', settlement });
});

// GET /api/v1/settlements/:id
export const getSettlement = asyncHandler(async (req, res) => {
  const settlement = await SettlementService.getSettlement(req.params.id);
  if (!settlement) throw new NotFoundError('Settlement');
  res.json({ settlement });
});

// GET /api/v1/settlements
export const listSettlements = asyncHandler(async (req, res) => {
  const filters = {
    merchantId: req.user.role === 'merchant' ? req.user.merchantId : req.query.merchantId,
    status: req.query.status,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  };
  
  const result = await SettlementService.listSettlements(filters, { page: req.query.page, limit: req.query.limit });
  res.json(result);
});

// POST /api/v1/settlements/:id/reconcile
export const reconcileSettlement = asyncHandler(async (req, res) => {
  if (!req.body.actualAmount) throw new ValidationError('actualAmount required');
  
  const result = await SettlementService.reconcileSettlement(
    req.params.id,
    parseFloat(req.body.actualAmount),
    req.user._id,
    req.body.notes
  );
  
  res.json({ message: 'Reconciliation completed', ...result });
});

// GET /api/v1/settlements/report
export const getReconciliationReport = asyncHandler(async (req, res) => {
  const report = await SettlementService.getReconciliationReport({
    startDate: req.query.startDate,
    endDate: req.query.endDate
  });
  res.json({ report });
});

export default { createBatch, processSettlement, getSettlement, listSettlements, reconcileSettlement, getReconciliationReport };

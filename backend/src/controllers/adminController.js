import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import Merchant from '../models/Merchant.js';
import * as ExchangeRateService from '../services/ExchangeRateService.js';
import { logChange } from '../services/AuditService.js';

// System configuration (in-memory for demo)
let systemConfig = {
  maintenanceMode: false,
  maxTransactionAmount: 100000,
  minTransactionAmount: 1,
  fxRefreshInterval: 1,
  defaultFeePercentage: 2.9,
  defaultFlatFee: 0.30
};

// PUT /api/v1/admin/config
export const updateConfig = asyncHandler(async (req, res) => {
  const before = { ...systemConfig };
  Object.assign(systemConfig, req.body);
  
  await logChange('config_updated', 'admin',
    { userId: req.user._id, email: req.user.email, role: req.user.role },
    { type: 'config' }, before, systemConfig);
  
  res.json({ message: 'Configuration updated', config: systemConfig });
});

// GET /api/v1/admin/config
export const getConfig = asyncHandler(async (req, res) => {
  res.json({ config: systemConfig });
});

// PUT /api/v1/admin/fx-source
export const updateFxSource = asyncHandler(async (req, res) => {
  res.json({ message: 'FX source updated', source: req.body.source || 'fawazahmed0' });
});

// PUT /api/v1/admin/fee-rules
export const updateFeeRules = asyncHandler(async (req, res) => {
  const { merchantId, percentageFee, flatFee, tier } = req.body;
  
  if (!merchantId) throw new ValidationError('merchantId required');
  
  const merchant = await Merchant.findById(merchantId);
  if (!merchant) throw new ValidationError('Merchant not found');
  
  const before = merchant.toJSON();
  
  if (percentageFee !== undefined) merchant.feeStructure.percentageFee = percentageFee;
  if (flatFee !== undefined) merchant.feeStructure.flatFee = flatFee;
  if (tier) merchant.tier = tier;
  
  await merchant.save();
  
  await logChange('fee_rules_updated', 'admin',
    { userId: req.user._id, email: req.user.email, role: req.user.role },
    { type: 'merchant', id: merchant._id }, before.feeStructure, merchant.feeStructure);
  
  res.json({ message: 'Fee rules updated', merchant });
});

// POST /api/v1/admin/refresh-rates
export const refreshRates = asyncHandler(async (req, res) => {
  const results = await ExchangeRateService.refreshAllRates();
  res.json({ message: 'Exchange rates refreshed', results });
});

// GET /api/v1/admin/stats
export const getSystemStats = asyncHandler(async (req, res) => {
  const User = (await import('../models/User.js')).default;
  const Payment = (await import('../models/Payment.js')).default;
  const Settlement = (await import('../models/Settlement.js')).default;
  
  const [users, merchants, payments, settlements] = await Promise.all([
    User.countDocuments(),
    Merchant.countDocuments(),
    Payment.countDocuments(),
    Settlement.countDocuments()
  ]);
  
  res.json({ stats: { users, merchants, payments, settlements, config: systemConfig } });
});

export default { updateConfig, getConfig, updateFxSource, updateFeeRules, refreshRates, getSystemStats };

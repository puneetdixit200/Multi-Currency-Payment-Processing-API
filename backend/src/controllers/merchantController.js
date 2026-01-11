import Merchant from '../models/Merchant.js';
import User from '../models/User.js';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { logChange } from '../services/AuditService.js';

// POST /api/v1/merchants
export const createMerchant = asyncHandler(async (req, res) => {
  const { businessName, businessType, contactEmail, contactPhone, address, bankDetails } = req.body;
  
  if (!businessName || !businessType || !contactEmail || !contactPhone) {
    throw new ValidationError('Required fields: businessName, businessType, contactEmail, contactPhone');
  }
  
  const merchant = new Merchant({
    businessName,
    businessType,
    contactEmail,
    contactPhone,
    address,
    bankDetails,
    supportedCurrencies: req.body.supportedCurrencies || ['USD', 'EUR', 'GBP'],
    defaultCurrency: req.body.defaultCurrency || 'USD'
  });
  
  await merchant.save();
  
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { merchantId: merchant._id });
  }
  
  await logChange('merchant_created', 'merchant', 
    { userId: req.user?._id, email: req.user?.email, role: req.user?.role, ipAddress: req.ip },
    { type: 'merchant', id: merchant._id }, null, merchant.toJSON());
  
  res.status(201).json({ message: 'Merchant created', merchant });
});

// GET /api/v1/merchants/:id
export const getMerchant = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findById(req.params.id);
  if (!merchant) throw new NotFoundError('Merchant');
  res.json({ merchant });
});

// PUT /api/v1/merchants/:id
export const updateMerchant = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findById(req.params.id);
  if (!merchant) throw new NotFoundError('Merchant');
  
  const before = merchant.toJSON();
  const updates = ['businessName', 'contactEmail', 'contactPhone', 'address', 'bankDetails', 'webhookUrl'];
  updates.forEach(field => { if (req.body[field]) merchant[field] = req.body[field]; });
  
  await merchant.save();
  
  await logChange('merchant_updated', 'merchant',
    { userId: req.user._id, email: req.user.email, role: req.user.role },
    { type: 'merchant', id: merchant._id }, before, merchant.toJSON());
  
  res.json({ message: 'Merchant updated', merchant });
});

// GET /api/v1/merchants
export const listMerchants = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.tier) query.tier = req.query.tier;
  
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  
  const [merchants, total] = await Promise.all([
    Merchant.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Merchant.countDocuments(query)
  ]);
  
  res.json({ merchants, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// PUT /api/v1/merchants/:id/approve
export const approveMerchant = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findById(req.params.id);
  if (!merchant) throw new NotFoundError('Merchant');
  
  merchant.status = 'active';
  merchant.onboardingStatus = 'approved';
  merchant.approvedBy = req.user._id;
  merchant.approvedAt = new Date();
  await merchant.save();
  
  res.json({ message: 'Merchant approved', merchant });
});

// GET /api/v1/merchants/:id/analytics
export const getMerchantAnalytics = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findById(req.params.id);
  if (!merchant) throw new NotFoundError('Merchant');
  
  const Payment = (await import('../models/Payment.js')).default;
  const stats = await Payment.aggregate([
    { $match: { merchantId: merchant._id } },
    { $group: { _id: null, total: { $sum: 1 }, volume: { $sum: '$sourceAmount' }, avgAmount: { $avg: '$sourceAmount' } } }
  ]);
  
  res.json({ merchant: { businessName: merchant.businessName, tier: merchant.tier }, stats: stats[0] || {} });
});

export default { createMerchant, getMerchant, updateMerchant, listMerchants, approveMerchant, getMerchantAnalytics };

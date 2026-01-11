import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import * as PaymentService from '../services/PaymentService.js';

// POST /api/v1/payments
export const createPayment = asyncHandler(async (req, res) => {
  const { sourceAmount, sourceCurrency, targetCurrency, customerId, customerEmail, customerName, description, paymentMethod, reference, metadata } = req.body;
  
  if (!sourceAmount || !sourceCurrency || !targetCurrency) {
    throw new ValidationError('sourceAmount, sourceCurrency, and targetCurrency are required');
  }
  
  const merchantId = req.user.merchantId || req.body.merchantId;
  if (!merchantId) {
    throw new ValidationError('Merchant ID required');
  }
  
  const result = await PaymentService.createPayment({
    sourceAmount: parseFloat(sourceAmount),
    sourceCurrency,
    targetCurrency,
    customerId,
    customerEmail,
    customerName,
    description,
    paymentMethod,
    reference,
    metadata,
    idempotencyKey: req.headers['idempotency-key'],
    clientInfo: { ipAddress: req.ip, userAgent: req.headers['user-agent'] }
  }, merchantId, {
    userId: req.user._id,
    email: req.user.email,
    role: req.user.role,
    ipAddress: req.ip
  });
  
  res.status(201).json({
    message: 'Payment created',
    payment: result.payment,
    creationTimeMs: result.creationTime,
    riskScore: result.fraudResult.riskScore
  });
});

// POST /api/v1/payments/:id/execute
export const executePayment = asyncHandler(async (req, res) => {
  const payment = await PaymentService.executePayment(req.params.id, {
    userId: req.user._id,
    role: req.user.role
  });
  
  if (!payment) throw new NotFoundError('Payment');
  
  res.json({ message: 'Payment execution initiated', payment });
});

// GET /api/v1/payments/:id
export const getPayment = asyncHandler(async (req, res) => {
  const payment = await PaymentService.getPayment(req.params.id);
  if (!payment) throw new NotFoundError('Payment');
  res.json({ payment });
});

// GET /api/v1/payments
export const listPayments = asyncHandler(async (req, res) => {
  const filters = {
    merchantId: req.user.role === 'merchant' ? req.user.merchantId : req.query.merchantId,
    status: req.query.status,
    sourceCurrency: req.query.sourceCurrency,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  };
  
  const result = await PaymentService.listPayments(filters, {
    page: req.query.page,
    limit: req.query.limit
  });
  
  res.json(result);
});

// POST /api/v1/payments/:id/refund
export const refundPayment = asyncHandler(async (req, res) => {
  const result = await PaymentService.refundPayment(req.params.id, {
    amount: req.body.amount,
    reason: req.body.reason
  }, { userId: req.user._id, email: req.user.email, role: req.user.role });
  
  res.json({ message: 'Refund initiated', ...result });
});

// GET /api/v1/payments/analytics
export const getAnalytics = asyncHandler(async (req, res) => {
  const merchantId = req.user.role === 'merchant' ? req.user.merchantId : req.query.merchantId;
  if (!merchantId) throw new ValidationError('Merchant ID required');
  
  const analytics = await PaymentService.getPaymentAnalytics(merchantId, {
    startDate: req.query.startDate,
    endDate: req.query.endDate
  });
  
  res.json({ analytics });
});

export default { createPayment, executePayment, getPayment, listPayments, refundPayment, getAnalytics };

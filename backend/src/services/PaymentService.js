import Payment from '../models/Payment.js';
import Merchant from '../models/Merchant.js';
import AuditLog from '../models/AuditLog.js';
import { convertCurrency, getExchangeRate } from './ExchangeRateService.js';
import { checkFraud } from './FraudService.js';

/**
 * Payment Service
 * Handles payment creation, processing, lifecycle management
 * Target: <100ms payment creation
 */

/**
 * Create a new payment
 */
export const createPayment = async (paymentData, merchantId, actor) => {
  const startTime = Date.now();
  
  // Get merchant
  const merchant = await Merchant.findById(merchantId);
  if (!merchant) {
    throw new Error('Merchant not found');
  }
  
  if (merchant.status !== 'active') {
    throw new Error('Merchant account is not active');
  }
  
  // Calculate fees
  const feeResult = merchant.calculateFee(
    paymentData.sourceAmount,
    paymentData.sourceCurrency
  );
  
  // Get exchange rate if currencies differ
  let exchangeInfo = null;
  let targetAmount = paymentData.sourceAmount;
  
  if (paymentData.sourceCurrency !== paymentData.targetCurrency) {
    exchangeInfo = await getExchangeRate(
      paymentData.sourceCurrency,
      paymentData.targetCurrency
    );
    
    if (!exchangeInfo) {
      throw new Error(`Exchange rate not available for ${paymentData.sourceCurrency}/${paymentData.targetCurrency}`);
    }
    
    targetAmount = paymentData.sourceAmount * exchangeInfo.rate;
  }
  
  // Calculate net amount after fees
  const netAmount = targetAmount - feeResult.totalFee;
  
  // Create payment record
  const payment = new Payment({
    merchantId,
    customerId: paymentData.customerId,
    customerEmail: paymentData.customerEmail,
    customerName: paymentData.customerName,
    sourceAmount: paymentData.sourceAmount,
    sourceCurrency: paymentData.sourceCurrency.toUpperCase(),
    targetAmount: Math.round(targetAmount * 100) / 100,
    targetCurrency: paymentData.targetCurrency.toUpperCase(),
    exchangeRate: exchangeInfo ? {
      rate: exchangeInfo.rate,
      inverseRate: exchangeInfo.inverseRate,
      rateId: exchangeInfo.rateId,
      fetchedAt: new Date(),
      source: exchangeInfo.source
    } : null,
    fees: {
      percentageFee: feeResult.percentageFee,
      flatFee: feeResult.flatFee,
      totalFee: feeResult.totalFee,
      feeCurrency: paymentData.targetCurrency.toUpperCase(),
      discount: feeResult.discount
    },
    netAmount: Math.round(netAmount * 100) / 100,
    status: 'initiated',
    statusHistory: [{
      status: 'initiated',
      timestamp: new Date(),
      reason: 'Payment created'
    }],
    paymentMethod: paymentData.paymentMethod,
    description: paymentData.description,
    reference: paymentData.reference,
    metadata: paymentData.metadata,
    clientInfo: paymentData.clientInfo,
    idempotencyKey: paymentData.idempotencyKey,
    idempotencyExpiry: paymentData.idempotencyKey 
      ? new Date(Date.now() + 24 * 60 * 60 * 1000) 
      : null
  });
  
  // Run fraud checks
  const fraudResult = await checkFraud(payment, merchant);
  payment.riskScore = fraudResult.riskScore;
  
  if (fraudResult.blocked) {
    payment.status = 'failed';
    payment.errorCode = 'FRAUD_DETECTED';
    payment.errorMessage = fraudResult.reason;
    payment.fraudFlags = fraudResult.flags;
  }
  
  await payment.save();
  
  const creationTime = Date.now() - startTime;
  
  // Log audit
  await AuditLog.log({
    action: 'payment_created',
    category: 'payment',
    actor: {
      userId: actor?.userId,
      email: actor?.email,
      role: actor?.role,
      ipAddress: actor?.ipAddress
    },
    resource: {
      type: 'payment',
      id: payment._id,
      identifier: payment.transactionId
    },
    changes: {
      after: {
        transactionId: payment.transactionId,
        status: payment.status,
        sourceAmount: payment.sourceAmount,
        sourceCurrency: payment.sourceCurrency,
        targetAmount: payment.targetAmount,
        targetCurrency: payment.targetCurrency
      }
    },
    metadata: new Map([
      ['creationTimeMs', creationTime],
      ['merchantId', merchantId.toString()]
    ])
  });
  
  return {
    payment,
    creationTime,
    fraudResult
  };
};

/**
 * Execute a payment (move from initiated to processing)
 */
export const executePayment = async (paymentId, actor) => {
  const payment = await Payment.findById(paymentId);
  
  if (!payment) {
    throw new Error('Payment not found');
  }
  
  if (payment.status !== 'initiated') {
    throw new Error(`Cannot execute payment in ${payment.status} status`);
  }
  
  // Simulate payment processing
  await payment.updateStatus('processing', 'Payment execution started', actor?.userId);
  
  // In a real system, this would integrate with payment processors
  // For now, simulate success after a short delay
  setTimeout(async () => {
    try {
      await payment.updateStatus('completed', 'Payment processed successfully', null);
      
      // Update merchant stats
      await Merchant.findByIdAndUpdate(payment.merchantId, {
        $inc: {
          totalVolume: payment.targetAmount,
          monthlyVolume: payment.targetAmount,
          transactionCount: 1
        }
      });
    } catch (error) {
      console.error('Error completing payment:', error);
      await payment.updateStatus('failed', error.message, null);
    }
  }, 100);
  
  return payment;
};

/**
 * Get payment by ID
 */
export const getPayment = async (paymentId) => {
  return Payment.findById(paymentId).populate('merchantId', 'businessName');
};

/**
 * Get payment by transaction ID
 */
export const getPaymentByTransactionId = async (transactionId) => {
  return Payment.findOne({ transactionId }).populate('merchantId', 'businessName');
};

/**
 * List payments with filters
 */
export const listPayments = async (filters = {}, options = {}) => {
  const query = {};
  
  if (filters.merchantId) query.merchantId = filters.merchantId;
  if (filters.status) query.status = filters.status;
  if (filters.sourceCurrency) query.sourceCurrency = filters.sourceCurrency.toUpperCase();
  if (filters.targetCurrency) query.targetCurrency = filters.targetCurrency.toUpperCase();
  if (filters.customerId) query.customerId = filters.customerId;
  
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }
  
  if (filters.minAmount) query.sourceAmount = { $gte: parseFloat(filters.minAmount) };
  if (filters.maxAmount) {
    query.sourceAmount = query.sourceAmount || {};
    query.sourceAmount.$lte = parseFloat(filters.maxAmount);
  }
  
  const page = parseInt(options.page) || 1;
  const limit = Math.min(parseInt(options.limit) || 20, 100);
  const skip = (page - 1) * limit;
  const sort = options.sort || { createdAt: -1 };
  
  const [payments, total] = await Promise.all([
    Payment.find(query)
      .populate('merchantId', 'businessName')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(query)
  ]);
  
  return {
    payments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Refund a payment
 */
export const refundPayment = async (paymentId, refundData, actor) => {
  const payment = await Payment.findById(paymentId);
  
  if (!payment) {
    throw new Error('Payment not found');
  }
  
  const refundAmount = refundData.amount || payment.sourceAmount;
  
  if (!payment.canRefund(refundAmount)) {
    throw new Error('Refund not allowed for this payment');
  }
  
  const refundId = `REF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  
  payment.refunds.push({
    refundId,
    amount: refundAmount,
    currency: payment.sourceCurrency,
    reason: refundData.reason,
    status: 'pending',
    createdAt: new Date()
  });
  
  payment.totalRefunded += refundAmount;
  
  if (payment.totalRefunded >= payment.sourceAmount) {
    await payment.updateStatus('refunded', 'Full refund processed', actor?.userId);
  }
  
  await payment.save();
  
  // Log audit
  await AuditLog.log({
    action: 'payment_refunded',
    category: 'payment',
    actor: {
      userId: actor?.userId,
      email: actor?.email,
      role: actor?.role
    },
    resource: {
      type: 'payment',
      id: payment._id,
      identifier: payment.transactionId
    },
    changes: {
      after: {
        refundId,
        refundAmount,
        totalRefunded: payment.totalRefunded
      }
    }
  });
  
  return {
    payment,
    refund: payment.refunds[payment.refunds.length - 1]
  };
};

/**
 * Get payment analytics for a merchant
 */
export const getPaymentAnalytics = async (merchantId, dateRange = {}) => {
  const match = { merchantId };
  
  if (dateRange.startDate || dateRange.endDate) {
    match.createdAt = {};
    if (dateRange.startDate) match.createdAt.$gte = new Date(dateRange.startDate);
    if (dateRange.endDate) match.createdAt.$lte = new Date(dateRange.endDate);
  }
  
  const [stats, byStatus, byCurrency, daily] = await Promise.all([
    // Overall stats
    Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalVolume: { $sum: '$sourceAmount' },
          totalFees: { $sum: '$fees.totalFee' },
          avgAmount: { $avg: '$sourceAmount' },
          successRate: {
            $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]),
    
    // By status
    Payment.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 }, volume: { $sum: '$sourceAmount' } } },
      { $sort: { count: -1 } }
    ]),
    
    // By currency
    Payment.aggregate([
      { $match: match },
      { $group: { _id: '$sourceCurrency', count: { $sum: 1 }, volume: { $sum: '$sourceAmount' } } },
      { $sort: { volume: -1 } }
    ]),
    
    // Daily trend (last 30 days)
    Payment.aggregate([
      { $match: { ...match, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          volume: { $sum: '$sourceAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);
  
  return {
    summary: stats[0] || { totalCount: 0, totalVolume: 0, totalFees: 0, avgAmount: 0, successRate: 0 },
    byStatus,
    byCurrency,
    dailyTrend: daily
  };
};

export default {
  createPayment,
  executePayment,
  getPayment,
  getPaymentByTransactionId,
  listPayments,
  refundPayment,
  getPaymentAnalytics
};

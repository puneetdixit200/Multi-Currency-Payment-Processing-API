import Payment from '../models/Payment.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Fraud Prevention Service
 * Lightweight fraud detection with velocity checks, duplicate detection,
 * and exchange rate anomaly alerts
 */

// In-memory velocity tracking
const velocityStore = new Map();

// Cleanup velocity store every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of velocityStore.entries()) {
    if (data.windowEnd < now) {
      velocityStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Velocity check configuration
 */
const VELOCITY_LIMITS = {
  perHour: parseInt(process.env.MAX_TRANSACTIONS_PER_HOUR) || 50,
  perDay: 200,
  amountPerHour: 50000,
  amountPerDay: 200000
};

/**
 * Check transaction velocity
 */
const checkVelocity = async (payment, merchant) => {
  const flags = [];
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  const dayAgo = now - 24 * 60 * 60 * 1000;
  
  const merchantId = merchant._id.toString();
  const customerId = payment.customerId || payment.clientInfo?.ipAddress || 'unknown';
  
  // Get velocity keys
  const merchantHourKey = `merchant:${merchantId}:hour`;
  const customerHourKey = `customer:${customerId}:hour`;
  
  // Initialize or get velocity data
  let merchantVelocity = velocityStore.get(merchantHourKey) || {
    count: 0,
    amount: 0,
    windowStart: now,
    windowEnd: now + 60 * 60 * 1000
  };
  
  let customerVelocity = velocityStore.get(customerHourKey) || {
    count: 0,
    amount: 0,
    windowStart: now,
    windowEnd: now + 60 * 60 * 1000
  };
  
  // Reset if window expired
  if (now > merchantVelocity.windowEnd) {
    merchantVelocity = { count: 0, amount: 0, windowStart: now, windowEnd: now + 60 * 60 * 1000 };
  }
  if (now > customerVelocity.windowEnd) {
    customerVelocity = { count: 0, amount: 0, windowStart: now, windowEnd: now + 60 * 60 * 1000 };
  }
  
  // Check merchant velocity
  if (merchantVelocity.count >= VELOCITY_LIMITS.perHour) {
    flags.push({
      type: 'MERCHANT_VELOCITY_EXCEEDED',
      message: `Merchant exceeded ${VELOCITY_LIMITS.perHour} transactions/hour`,
      severity: 'high'
    });
  }
  
  if (merchantVelocity.amount + payment.sourceAmount > VELOCITY_LIMITS.amountPerHour) {
    flags.push({
      type: 'MERCHANT_AMOUNT_VELOCITY',
      message: `Merchant approaching hourly amount limit`,
      severity: 'medium'
    });
  }
  
  // Check customer velocity
  if (customerVelocity.count >= 10) {
    flags.push({
      type: 'CUSTOMER_VELOCITY_EXCEEDED',
      message: 'Customer exceeded 10 transactions/hour',
      severity: 'high'
    });
  }
  
  // Update velocity
  merchantVelocity.count++;
  merchantVelocity.amount += payment.sourceAmount;
  customerVelocity.count++;
  customerVelocity.amount += payment.sourceAmount;
  
  velocityStore.set(merchantHourKey, merchantVelocity);
  velocityStore.set(customerHourKey, customerVelocity);
  
  return flags;
};

/**
 * Check for duplicate transactions
 */
const checkDuplicate = async (payment, merchant) => {
  const flags = [];
  const windowMinutes = parseInt(process.env.DUPLICATE_DETECTION_WINDOW_MINUTES) || 5;
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  
  // Look for similar recent transactions
  const similarPayments = await Payment.find({
    merchantId: merchant._id,
    sourceAmount: payment.sourceAmount,
    sourceCurrency: payment.sourceCurrency,
    customerEmail: payment.customerEmail,
    createdAt: { $gte: windowStart },
    status: { $nin: ['failed', 'cancelled'] }
  }).limit(5);
  
  if (similarPayments.length > 0) {
    flags.push({
      type: 'POTENTIAL_DUPLICATE',
      message: `${similarPayments.length} similar transaction(s) in last ${windowMinutes} minutes`,
      severity: 'medium',
      relatedTransactions: similarPayments.map(p => p.transactionId)
    });
  }
  
  // Check for exact duplicates (same idempotency key handled by middleware)
  
  return flags;
};

/**
 * Check for amount anomalies
 */
const checkAmountAnomaly = async (payment, merchant) => {
  const flags = [];
  const maxAmount = parseInt(process.env.MAX_AMOUNT_PER_TRANSACTION) || 100000;
  
  // Check against maximum
  if (payment.sourceAmount > maxAmount) {
    flags.push({
      type: 'AMOUNT_EXCEEDS_LIMIT',
      message: `Transaction amount ${payment.sourceAmount} exceeds limit ${maxAmount}`,
      severity: 'high'
    });
  }
  
  // Check against merchant average
  const avgResult = await Payment.aggregate([
    { $match: { merchantId: merchant._id, status: 'completed' } },
    { $group: { _id: null, avg: { $avg: '$sourceAmount' }, stdDev: { $stdDevPop: '$sourceAmount' } } }
  ]);
  
  if (avgResult.length > 0) {
    const { avg, stdDev } = avgResult[0];
    
    // Flag if more than 3 standard deviations from average
    if (stdDev && payment.sourceAmount > avg + (3 * stdDev)) {
      flags.push({
        type: 'UNUSUAL_AMOUNT',
        message: `Amount significantly higher than merchant average (${avg.toFixed(2)})`,
        severity: 'medium'
      });
    }
  }
  
  return flags;
};

/**
 * Check exchange rate anomalies
 */
const checkRateAnomaly = async (payment) => {
  const flags = [];
  
  if (payment.exchangeRate?.source === 'fallback') {
    flags.push({
      type: 'FALLBACK_RATE_USED',
      message: 'Exchange rate from fallback source',
      severity: 'low'
    });
  }
  
  // Check if rate is significantly different from expected
  // This would compare against market rates
  
  return flags;
};

/**
 * Check for suspicious patterns
 */
const checkSuspiciousPatterns = async (payment, merchant) => {
  const flags = [];
  
  // Check for round amounts (often indicates testing or fraud)
  if (payment.sourceAmount % 100 === 0 && payment.sourceAmount >= 1000) {
    flags.push({
      type: 'ROUND_AMOUNT',
      message: 'Suspiciously round transaction amount',
      severity: 'low'
    });
  }
  
  // Check time-based patterns (e.g., late night transactions)
  const hour = new Date().getHours();
  if (hour >= 2 && hour <= 5) {
    flags.push({
      type: 'UNUSUAL_HOUR',
      message: 'Transaction at unusual hour (2-5 AM)',
      severity: 'low'
    });
  }
  
  // Check for new customer with high amount
  if (!payment.customerId && payment.sourceAmount > 5000) {
    flags.push({
      type: 'NEW_CUSTOMER_HIGH_AMOUNT',
      message: 'Anonymous customer with high transaction amount',
      severity: 'medium'
    });
  }
  
  return flags;
};

/**
 * Calculate risk score (0-100)
 */
const calculateRiskScore = (flags) => {
  const severityScores = {
    low: 5,
    medium: 15,
    high: 30,
    critical: 50
  };
  
  let score = 0;
  
  for (const flag of flags) {
    score += severityScores[flag.severity] || 10;
  }
  
  return Math.min(100, score);
};

/**
 * Main fraud check function
 */
export const checkFraud = async (payment, merchant) => {
  const allFlags = [];
  
  // Run all checks
  const [velocityFlags, duplicateFlags, amountFlags, rateFlags, patternFlags] = await Promise.all([
    checkVelocity(payment, merchant),
    checkDuplicate(payment, merchant),
    checkAmountAnomaly(payment, merchant),
    checkRateAnomaly(payment),
    checkSuspiciousPatterns(payment, merchant)
  ]);
  
  allFlags.push(...velocityFlags, ...duplicateFlags, ...amountFlags, ...rateFlags, ...patternFlags);
  
  const riskScore = calculateRiskScore(allFlags);
  
  // Determine if transaction should be blocked
  const blocked = allFlags.some(f => f.severity === 'critical') || riskScore >= 70;
  
  const result = {
    riskScore,
    flags: allFlags,
    blocked,
    reason: blocked ? 'Transaction blocked due to high risk' : null,
    checkedAt: new Date().toISOString()
  };
  
  // Log high-risk transactions
  if (riskScore >= 50) {
    await AuditLog.log({
      action: 'fraud_alert',
      category: 'payment',
      resource: {
        type: 'payment',
        identifier: payment.transactionId
      },
      metadata: new Map([
        ['riskScore', riskScore],
        ['flags', JSON.stringify(allFlags)],
        ['blocked', blocked]
      ]),
      severity: riskScore >= 70 ? 'critical' : 'warning',
      tags: ['fraud', 'security']
    });
  }
  
  return result;
};

/**
 * Alert on exchange rate anomalies
 */
export const alertRateAnomaly = async (rateInfo) => {
  if (rateInfo.isAnomaly) {
    await AuditLog.log({
      action: 'exchange_rate_anomaly',
      category: 'currency',
      resource: {
        type: 'exchange_rate',
        id: rateInfo._id
      },
      metadata: new Map([
        ['baseCurrency', rateInfo.baseCurrency],
        ['targetCurrency', rateInfo.targetCurrency],
        ['changePercent', rateInfo.changePercent],
        ['reason', rateInfo.anomalyReason]
      ]),
      severity: 'warning',
      tags: ['fx', 'anomaly']
    });
  }
};

/**
 * Get fraud statistics
 */
export const getFraudStats = async (dateRange = {}) => {
  const match = {};
  
  if (dateRange.startDate || dateRange.endDate) {
    match.createdAt = {};
    if (dateRange.startDate) match.createdAt.$gte = new Date(dateRange.startDate);
    if (dateRange.endDate) match.createdAt.$lte = new Date(dateRange.endDate);
  }
  
  const [highRisk, blockedCount, flagDistribution] = await Promise.all([
    Payment.countDocuments({ ...match, riskScore: { $gte: 50 } }),
    Payment.countDocuments({ ...match, errorCode: 'FRAUD_DETECTED' }),
    Payment.aggregate([
      { $match: { ...match, 'fraudFlags.0': { $exists: true } } },
      { $unwind: '$fraudFlags' },
      { $group: { _id: '$fraudFlags.type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
  ]);
  
  return {
    highRiskTransactions: highRisk,
    blockedTransactions: blockedCount,
    flagDistribution,
    generatedAt: new Date().toISOString()
  };
};

export default {
  checkFraud,
  alertRateAnomaly,
  getFraudStats
};

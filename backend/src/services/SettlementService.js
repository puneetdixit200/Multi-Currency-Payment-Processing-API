import Payment from '../models/Payment.js';
import Settlement from '../models/Settlement.js';
import Merchant from '../models/Merchant.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Settlement Service
 * Handles daily batch processing, reconciliation, and settlement management
 */

/**
 * Create a settlement batch for a merchant
 */
export const createSettlementBatch = async (merchantId, dateRange, actor) => {
  const merchant = await Merchant.findById(merchantId);
  
  if (!merchant) {
    throw new Error('Merchant not found');
  }
  
  const periodStart = dateRange.startDate ? new Date(dateRange.startDate) : 
    new Date(new Date().setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000);
  
  const periodEnd = dateRange.endDate ? new Date(dateRange.endDate) :
    new Date(new Date().setHours(23, 59, 59, 999) - 24 * 60 * 60 * 1000);
  
  // Find completed payments not yet settled
  const payments = await Payment.find({
    merchantId,
    status: 'completed',
    settlementId: null,
    completedAt: { $gte: periodStart, $lte: periodEnd }
  });
  
  if (payments.length === 0) {
    return { message: 'No payments to settle', payments: 0 };
  }
  
  // Calculate totals
  let grossAmount = 0;
  let totalFees = 0;
  let refundAmount = 0;
  
  for (const payment of payments) {
    grossAmount += payment.targetAmount;
    totalFees += payment.fees?.totalFee || 0;
    refundAmount += payment.totalRefunded || 0;
  }
  
  const netAmount = grossAmount - totalFees - refundAmount;
  
  // Create settlement
  const settlement = new Settlement({
    merchantId,
    periodStart,
    periodEnd,
    grossAmount: Math.round(grossAmount * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100,
    currency: merchant.defaultCurrency || 'INR',
    transactionCount: payments.length,
    successfulTransactions: payments.filter(p => p.status === 'completed').length,
    failedTransactions: 0,
    refundedTransactions: payments.filter(p => p.totalRefunded > 0).length,
    refundAmount: Math.round(refundAmount * 100) / 100,
    payments: payments.map(p => p._id),
    status: 'pending',
    statusHistory: [{
      status: 'pending',
      timestamp: new Date(),
      reason: 'Settlement batch created'
    }],
    bankTransfer: {
      bankName: merchant.bankDetails?.bankName,
      accountLast4: merchant.bankDetails?.accountNumber?.slice(-4)
    },
    scheduledAt: new Date()
  });
  
  await settlement.save();
  
  // Mark payments as part of this settlement
  await Payment.updateMany(
    { _id: { $in: payments.map(p => p._id) } },
    { settlementId: settlement._id }
  );
  
  // Log audit
  await AuditLog.log({
    action: 'settlement_created',
    category: 'settlement',
    actor: {
      userId: actor?.userId,
      email: actor?.email,
      role: actor?.role
    },
    resource: {
      type: 'settlement',
      id: settlement._id,
      identifier: settlement.settlementId
    },
    changes: {
      after: {
        settlementId: settlement.settlementId,
        merchantId: merchantId.toString(),
        grossAmount,
        netAmount,
        transactionCount: payments.length
      }
    }
  });
  
  return settlement;
};

/**
 * Process a settlement (initiate bank transfer)
 */
export const processSettlement = async (settlementId, actor) => {
  const settlement = await Settlement.findById(settlementId);
  
  if (!settlement) {
    throw new Error('Settlement not found');
  }
  
  if (settlement.status !== 'pending') {
    throw new Error(`Cannot process settlement in ${settlement.status} status`);
  }
  
  await settlement.updateStatus('processing', 'Bank transfer initiated', actor?.userId);
  
  // Simulate bank transfer processing
  settlement.bankTransfer.initiatedAt = new Date();
  settlement.bankTransfer.reference = `TRF-${Date.now().toString(36).toUpperCase()}`;
  await settlement.save();
  
  // In production, this would integrate with banking APIs
  // Simulate async completion
  setTimeout(async () => {
    try {
      settlement.bankTransfer.completedAt = new Date();
      await settlement.updateStatus('completed', 'Bank transfer completed', null);
      
      // Mark payments as settled
      await Payment.updateMany(
        { settlementId: settlement._id },
        { status: 'settled', settledAt: new Date() }
      );
    } catch (error) {
      console.error('Settlement processing error:', error);
      settlement.bankTransfer.failureReason = error.message;
      await settlement.updateStatus('failed', error.message, null);
    }
  }, 500);
  
  return settlement;
};

/**
 * Get settlement by ID
 */
export const getSettlement = async (settlementId) => {
  return Settlement.findById(settlementId)
    .populate('merchantId', 'businessName contactEmail')
    .populate('payments', 'transactionId sourceAmount status');
};

/**
 * List settlements with filters
 */
export const listSettlements = async (filters = {}, options = {}) => {
  const query = {};
  
  if (filters.merchantId) query.merchantId = filters.merchantId;
  if (filters.status) query.status = filters.status;
  
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }
  
  const page = parseInt(options.page) || 1;
  const limit = Math.min(parseInt(options.limit) || 20, 100);
  const skip = (page - 1) * limit;
  
  const [settlements, total] = await Promise.all([
    Settlement.find(query)
      .populate('merchantId', 'businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Settlement.countDocuments(query)
  ]);
  
  return {
    settlements,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Reconcile a settlement
 */
export const reconcileSettlement = async (settlementId, actualAmount, reconciledBy, notes) => {
  const settlement = await Settlement.findById(settlementId);
  
  if (!settlement) {
    throw new Error('Settlement not found');
  }
  
  if (settlement.status !== 'completed') {
    throw new Error('Can only reconcile completed settlements');
  }
  
  const reconciliation = await settlement.reconcile(actualAmount, reconciledBy, notes);
  
  // Log audit
  await AuditLog.log({
    action: 'settlement_reconciled',
    category: 'settlement',
    actor: {
      userId: reconciledBy
    },
    resource: {
      type: 'settlement',
      id: settlement._id,
      identifier: settlement.settlementId
    },
    changes: {
      after: reconciliation
    }
  });
  
  return {
    settlement,
    reconciliation
  };
};

/**
 * Get reconciliation report
 */
export const getReconciliationReport = async (dateRange = {}) => {
  const match = {
    status: 'completed'
  };
  
  if (dateRange.startDate || dateRange.endDate) {
    match.completedAt = {};
    if (dateRange.startDate) match.completedAt.$gte = new Date(dateRange.startDate);
    if (dateRange.endDate) match.completedAt.$lte = new Date(dateRange.endDate);
  }
  
  const [summary, byMerchant, discrepancies] = await Promise.all([
    // Overall summary
    Settlement.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalSettlements: { $sum: 1 },
          totalGross: { $sum: '$grossAmount' },
          totalFees: { $sum: '$totalFees' },
          totalNet: { $sum: '$netAmount' },
          totalTransactions: { $sum: '$transactionCount' },
          reconciledCount: {
            $sum: { $cond: [{ $eq: ['$reconciliation.status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]),
    
    // By merchant
    Settlement.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$merchantId',
          count: { $sum: 1 },
          totalNet: { $sum: '$netAmount' },
          transactions: { $sum: '$transactionCount' }
        }
      },
      {
        $lookup: {
          from: 'merchants',
          localField: '_id',
          foreignField: '_id',
          as: 'merchant'
        }
      },
      { $unwind: '$merchant' },
      { $project: { merchantName: '$merchant.businessName', count: 1, totalNet: 1, transactions: 1 } },
      { $sort: { totalNet: -1 } }
    ]),
    
    // Discrepancies
    Settlement.find({
      ...match,
      'reconciliation.status': 'discrepancy_found'
    })
      .populate('merchantId', 'businessName')
      .select('settlementId merchantId netAmount reconciliation')
      .lean()
  ]);
  
  return {
    summary: summary[0] || {
      totalSettlements: 0,
      totalGross: 0,
      totalFees: 0,
      totalNet: 0,
      totalTransactions: 0,
      reconciledCount: 0
    },
    byMerchant,
    discrepancies,
    generatedAt: new Date().toISOString()
  };
};

/**
 * Run daily settlement batch for all eligible merchants
 */
export const runDailySettlementBatch = async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);
  
  // Find merchants with daily settlement and completed payments
  const merchantsWithPayments = await Payment.distinct('merchantId', {
    status: 'completed',
    settlementId: null,
    completedAt: { $gte: yesterday, $lte: endOfYesterday }
  });
  
  const results = [];
  
  for (const merchantId of merchantsWithPayments) {
    try {
      const settlement = await createSettlementBatch(
        merchantId,
        { startDate: yesterday, endDate: endOfYesterday },
        { userId: null, role: 'system' }
      );
      
      if (settlement.settlementId) {
        await processSettlement(settlement._id, { role: 'system' });
        results.push({
          merchantId: merchantId.toString(),
          success: true,
          settlementId: settlement.settlementId,
          amount: settlement.netAmount
        });
      }
    } catch (error) {
      results.push({
        merchantId: merchantId.toString(),
        success: false,
        error: error.message
      });
    }
  }
  
  console.log(`Daily settlement batch completed. Processed ${results.length} merchants.`);
  
  return results;
};

export default {
  createSettlementBatch,
  processSettlement,
  getSettlement,
  listSettlements,
  reconcileSettlement,
  getReconciliationReport,
  runDailySettlementBatch
};

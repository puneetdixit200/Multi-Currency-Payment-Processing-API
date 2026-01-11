import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  idempotencyExpiry: {
    type: Date
  },
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true,
    index: true
  },
  customerId: {
    type: String,
    index: true
  },
  customerEmail: String,
  customerName: String,
  // Source amount (what customer pays)
  sourceAmount: {
    type: Number,
    required: true
  },
  sourceCurrency: {
    type: String,
    required: true,
    uppercase: true
  },
  // Target amount (what merchant receives before fees)
  targetAmount: {
    type: Number
  },
  targetCurrency: {
    type: String,
    required: true,
    uppercase: true
  },
  // Exchange rate details
  exchangeRate: {
    rate: Number,
    inverseRate: Number,
    rateId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExchangeRate' },
    fetchedAt: Date,
    source: String
  },
  // Fee breakdown
  fees: {
    percentageFee: Number,
    flatFee: Number,
    totalFee: Number,
    feeCurrency: { type: String, uppercase: true },
    discount: Number
  },
  // Net amount (what merchant receives after fees)
  netAmount: {
    type: Number
  },
  // Payment status lifecycle
  status: {
    type: String,
    enum: ['initiated', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'settled'],
    default: 'initiated',
    index: true
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    reason: String,
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  // Payment method
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'bank_transfer', 'wallet', 'crypto']
    },
    last4: String,
    brand: String,
    expiryMonth: Number,
    expiryYear: Number,
    bankName: String,
    accountLast4: String
  },
  // Routing information
  routing: {
    processor: String,
    processorTransactionId: String,
    gateway: String,
    channel: String
  },
  // Settlement tracking
  settlementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Settlement',
    index: true
  },
  settledAt: Date,
  // Refund tracking
  refunds: [{
    refundId: String,
    amount: Number,
    currency: String,
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed']
    },
    createdAt: { type: Date, default: Date.now },
    completedAt: Date
  }],
  totalRefunded: {
    type: Number,
    default: 0
  },
  // Risk and fraud
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  fraudFlags: [{
    type: String,
    detectedAt: Date,
    resolved: Boolean
  }],
  // Metadata
  description: String,
  reference: String,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  // IP and device info
  clientInfo: {
    ipAddress: String,
    userAgent: String,
    deviceId: String,
    country: String
  },
  // Timestamps
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date,
  completedAt: Date,
  failedAt: Date,
  // Error tracking
  errorCode: String,
  errorMessage: String,
  // Offline sync
  syncStatus: {
    type: String,
    enum: ['synced', 'pending', 'failed'],
    default: 'synced'
  },
  syncAttempts: {
    type: Number,
    default: 0
  },
  lastSyncAttempt: Date
}, {
  timestamps: true
});

// Compound indexes for common queries
paymentSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
paymentSchema.index({ merchantId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ settlementId: 1, status: 1 });
paymentSchema.index({ transactionId: 1 }, { unique: true });

// Generate transaction ID
paymentSchema.pre('save', function(next) {
  if (!this.transactionId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.transactionId = `TXN-${timestamp}-${random}`;
  }
  next();
});

// Update status with history
paymentSchema.methods.updateStatus = async function(newStatus, reason, actor) {
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    reason,
    actor
  });
  this.status = newStatus;
  
  // Update relevant timestamps
  switch (newStatus) {
    case 'processing':
      this.processedAt = new Date();
      break;
    case 'completed':
      this.completedAt = new Date();
      break;
    case 'failed':
      this.failedAt = new Date();
      break;
    case 'settled':
      this.settledAt = new Date();
      break;
  }
  
  await this.save();
};

// Calculate if payment can be refunded
paymentSchema.methods.canRefund = function(amount) {
  if (!['completed', 'settled'].includes(this.status)) return false;
  const remainingAmount = this.sourceAmount - this.totalRefunded;
  return amount <= remainingAmount;
};

// Virtual for refundable amount
paymentSchema.virtual('refundableAmount').get(function() {
  return this.sourceAmount - this.totalRefunded;
});

// Transform JSON output
paymentSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    if (ret.paymentMethod?.last4) {
      ret.paymentMethod.number = `****${ret.paymentMethod.last4}`;
    }
    return ret;
  }
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;

import mongoose from 'mongoose';

const settlementSchema = new mongoose.Schema({
  settlementId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true,
    index: true
  },
  // Period covered
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  // Amounts
  grossAmount: {
    type: Number,
    required: true
  },
  totalFees: {
    type: Number,
    required: true
  },
  netAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    uppercase: true
  },
  // Transaction breakdown
  transactionCount: {
    type: Number,
    required: true
  },
  successfulTransactions: Number,
  failedTransactions: Number,
  refundedTransactions: Number,
  refundAmount: {
    type: Number,
    default: 0
  },
  // Payment references
  payments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  }],
  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'on_hold'],
    default: 'pending',
    index: true
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    reason: String,
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  // Reconciliation
  reconciliation: {
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'discrepancy_found'],
      default: 'pending'
    },
    reconciledAt: Date,
    reconciledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expectedAmount: Number,
    actualAmount: Number,
    discrepancy: Number,
    notes: String
  },
  // Bank transfer details
  bankTransfer: {
    bankName: String,
    accountLast4: String,
    reference: String,
    initiatedAt: Date,
    completedAt: Date,
    failureReason: String
  },
  // Batch processing
  batchId: String,
  batchSequence: Number,
  // Retry tracking
  retryCount: {
    type: Number,
    default: 0
  },
  lastRetryAt: Date,
  nextRetryAt: Date,
  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  notes: [{
    content: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  // Timestamps
  scheduledAt: Date,
  processedAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

// Indexes
settlementSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
settlementSchema.index({ status: 1, scheduledAt: 1 });
settlementSchema.index({ batchId: 1 });
settlementSchema.index({ periodStart: 1, periodEnd: 1 });

// Generate settlement ID
settlementSchema.pre('save', function(next) {
  if (!this.settlementId) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.settlementId = `STL-${date}-${random}`;
  }
  next();
});

// Update status with history
settlementSchema.methods.updateStatus = async function(newStatus, reason, actor) {
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    reason,
    actor
  });
  this.status = newStatus;
  
  switch (newStatus) {
    case 'processing':
      this.processedAt = new Date();
      break;
    case 'completed':
      this.completedAt = new Date();
      break;
  }
  
  await this.save();
};

// Calculate reconciliation
settlementSchema.methods.reconcile = async function(actualAmount, reconciledBy, notes) {
  this.reconciliation = {
    status: 'completed',
    reconciledAt: new Date(),
    reconciledBy,
    expectedAmount: this.netAmount,
    actualAmount,
    discrepancy: actualAmount - this.netAmount,
    notes
  };
  
  if (Math.abs(this.reconciliation.discrepancy) > 0.01) {
    this.reconciliation.status = 'discrepancy_found';
  }
  
  await this.save();
  return this.reconciliation;
};

// Virtual for reconciliation accuracy
settlementSchema.virtual('reconciliationAccuracy').get(function() {
  if (!this.reconciliation?.actualAmount) return null;
  return ((this.netAmount / this.reconciliation.actualAmount) * 100).toFixed(2);
});

// Transform JSON output
settlementSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    if (ret.bankTransfer?.accountLast4) {
      ret.bankTransfer.accountNumber = `****${ret.bankTransfer.accountLast4}`;
    }
    return ret;
  }
});

const Settlement = mongoose.model('Settlement', settlementSchema);

export default Settlement;

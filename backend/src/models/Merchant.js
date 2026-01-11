import mongoose from 'mongoose';

const merchantSchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  businessType: {
    type: String,
    enum: ['individual', 'partnership', 'corporation', 'llc', 'nonprofit'],
    required: true
  },
  registrationNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  taxId: {
    type: String,
    unique: true,
    sparse: true
  },
  contactEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  contactPhone: {
    type: String,
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: {
      type: String,
      required: true,
      uppercase: true
    }
  },
  bankDetails: {
    bankName: String,
    accountNumber: String,
    routingNumber: String,
    swiftCode: String,
    iban: String,
    currency: {
      type: String,
      default: 'USD',
      uppercase: true
    }
  },
  tier: {
    type: String,
    enum: ['starter', 'growth', 'enterprise', 'vip'],
    default: 'starter',
    index: true
  },
  feeStructure: {
    percentageFee: {
      type: Number,
      default: 2.9 // 2.9% default
    },
    flatFee: {
      type: Number,
      default: 0.30 // $0.30 default
    },
    currencySpecificFees: [{
      currency: { type: String, uppercase: true },
      percentageFee: Number,
      flatFee: Number
    }]
  },
  volumeIncentives: [{
    minVolume: Number,
    maxVolume: Number,
    discountPercent: Number
  }],
  supportedCurrencies: [{
    type: String,
    uppercase: true
  }],
  defaultCurrency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'terminated'],
    default: 'pending',
    index: true
  },
  onboardingStatus: {
    type: String,
    enum: ['documents_pending', 'under_review', 'approved', 'rejected'],
    default: 'documents_pending'
  },
  documents: [{
    type: { type: String },
    url: String,
    uploadedAt: Date,
    verifiedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    }
  }],
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  totalVolume: {
    type: Number,
    default: 0
  },
  monthlyVolume: {
    type: Number,
    default: 0
  },
  transactionCount: {
    type: Number,
    default: 0
  },
  settlementSchedule: {
    type: String,
    enum: ['daily', 'weekly', 'biweekly', 'monthly'],
    default: 'daily'
  },
  webhookUrl: String,
  webhookSecret: String,
  apiKeys: [{
    key: String,
    name: String,
    permissions: [String],
    createdAt: { type: Date, default: Date.now },
    lastUsed: Date,
    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active'
    }
  }],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  notes: [{
    content: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Indexes
merchantSchema.index({ businessName: 'text', contactEmail: 'text' });
merchantSchema.index({ status: 1, tier: 1 });
merchantSchema.index({ createdAt: -1 });

// Calculate effective fee for a transaction
merchantSchema.methods.calculateFee = function(amount, currency) {
  let percentageFee = this.feeStructure.percentageFee;
  let flatFee = this.feeStructure.flatFee;
  
  // Check for currency-specific fees
  const currencyFee = this.feeStructure.currencySpecificFees?.find(
    f => f.currency === currency.toUpperCase()
  );
  
  if (currencyFee) {
    percentageFee = currencyFee.percentageFee ?? percentageFee;
    flatFee = currencyFee.flatFee ?? flatFee;
  }
  
  // Apply volume incentives
  let discount = 0;
  for (const incentive of this.volumeIncentives || []) {
    if (this.monthlyVolume >= incentive.minVolume && 
        (!incentive.maxVolume || this.monthlyVolume <= incentive.maxVolume)) {
      discount = incentive.discountPercent;
      break;
    }
  }
  
  const effectivePercentage = percentageFee * (1 - discount / 100);
  const calculatedFee = (amount * effectivePercentage / 100) + flatFee;
  
  return {
    percentageFee: effectivePercentage,
    flatFee,
    totalFee: Math.round(calculatedFee * 100) / 100,
    discount
  };
};

// Transform JSON output
merchantSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    if (ret.bankDetails) {
      ret.bankDetails.accountNumber = ret.bankDetails.accountNumber 
        ? '****' + ret.bankDetails.accountNumber.slice(-4) 
        : undefined;
    }
    return ret;
  }
});

const Merchant = mongoose.model('Merchant', merchantSchema);

export default Merchant;

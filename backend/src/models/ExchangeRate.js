import mongoose from 'mongoose';

const exchangeRateSchema = new mongoose.Schema({
  baseCurrency: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  targetCurrency: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  rate: {
    type: Number,
    required: true
  },
  inverseRate: {
    type: Number,
    required: true
  },
  // Rate versioning
  version: {
    type: Number,
    default: 1
  },
  // Time tracking
  fetchedAt: {
    type: Date,
    required: true,
    index: true
  },
  validFrom: {
    type: Date,
    required: true
  },
  validUntil: {
    type: Date
  },
  // Source metadata
  source: {
    type: String,
    enum: ['api', 'fallback', 'manual', 'cache'],
    default: 'api'
  },
  sourceUrl: String,
  apiVersion: String,
  // Status
  status: {
    type: String,
    enum: ['active', 'expired', 'invalid'],
    default: 'active',
    index: true
  },
  // Rate change tracking
  previousRate: Number,
  changePercent: Number,
  // Anomaly detection
  isAnomaly: {
    type: Boolean,
    default: false
  },
  anomalyReason: String,
  // Metadata
  metadata: {
    fetchDuration: Number, // ms
    retryCount: Number,
    batchId: String
  }
}, {
  timestamps: true
});

// Compound indexes
exchangeRateSchema.index({ baseCurrency: 1, targetCurrency: 1, status: 1 });
exchangeRateSchema.index({ baseCurrency: 1, targetCurrency: 1, fetchedAt: -1 });
exchangeRateSchema.index({ fetchedAt: -1, status: 1 });

// Get current rate pair
exchangeRateSchema.statics.getCurrentRate = async function(baseCurrency, targetCurrency) {
  return this.findOne({
    baseCurrency: baseCurrency.toUpperCase(),
    targetCurrency: targetCurrency.toUpperCase(),
    status: 'active'
  }).sort({ fetchedAt: -1 });
};

// Get rate history
exchangeRateSchema.statics.getRateHistory = async function(baseCurrency, targetCurrency, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.find({
    baseCurrency: baseCurrency.toUpperCase(),
    targetCurrency: targetCurrency.toUpperCase(),
    fetchedAt: { $gte: startDate }
  }).sort({ fetchedAt: -1 });
};

// Detect rate anomaly
exchangeRateSchema.methods.detectAnomaly = function(threshold = 5) {
  if (!this.previousRate || !this.changePercent) return false;
  
  const isAnomaly = Math.abs(this.changePercent) > threshold;
  
  if (isAnomaly) {
    this.isAnomaly = true;
    this.anomalyReason = `Rate changed by ${this.changePercent.toFixed(2)}% (threshold: ${threshold}%)`;
  }
  
  return isAnomaly;
};

// Calculate change from previous rate
exchangeRateSchema.pre('save', async function(next) {
  if (this.isNew && !this.previousRate) {
    const lastRate = await this.constructor.findOne({
      baseCurrency: this.baseCurrency,
      targetCurrency: this.targetCurrency,
      _id: { $ne: this._id }
    }).sort({ fetchedAt: -1 });
    
    if (lastRate) {
      this.previousRate = lastRate.rate;
      this.changePercent = ((this.rate - lastRate.rate) / lastRate.rate) * 100;
      this.version = lastRate.version + 1;
      
      // Auto-detect anomaly
      this.detectAnomaly();
    }
  }
  
  // Calculate inverse rate if not provided
  if (!this.inverseRate && this.rate) {
    this.inverseRate = 1 / this.rate;
  }
  
  next();
});

// Transform JSON output
exchangeRateSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    ret.rate = parseFloat(ret.rate.toFixed(6));
    ret.inverseRate = parseFloat(ret.inverseRate.toFixed(6));
    if (ret.changePercent) {
      ret.changePercent = parseFloat(ret.changePercent.toFixed(4));
    }
    return ret;
  }
});

const ExchangeRate = mongoose.model('ExchangeRate', exchangeRateSchema);

export default ExchangeRate;

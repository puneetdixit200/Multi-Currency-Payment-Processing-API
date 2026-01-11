import mongoose from 'mongoose';

const syncLogSchema = new mongoose.Schema({
  // Sync identification
  syncId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Operation details
  operation: {
    type: String,
    enum: ['create', 'update', 'delete'],
    required: true
  },
  collection: {
    type: String,
    required: true,
    index: true
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  // The actual data to sync
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  // Write-ahead log sequence
  walSequence: {
    type: Number,
    required: true,
    index: true
  },
  // Sync status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'conflict'],
    default: 'pending',
    index: true
  },
  // Attempt tracking
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 5
  },
  lastAttemptAt: Date,
  nextAttemptAt: Date,
  // Error tracking
  errors: [{
    message: String,
    code: String,
    timestamp: { type: Date, default: Date.now },
    stack: String
  }],
  // Conflict resolution
  conflict: {
    type: {
      type: String,
      enum: ['version_mismatch', 'duplicate_key', 'validation_error']
    },
    serverVersion: mongoose.Schema.Types.Mixed,
    resolution: {
      type: String,
      enum: ['client_wins', 'server_wins', 'merge', 'manual']
    },
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  // Client context
  clientInfo: {
    deviceId: String,
    appVersion: String,
    osVersion: String,
    networkType: String
  },
  // Priority for sync ordering
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  syncedAt: Date,
  // TTL - auto delete after 30 days
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    index: { expires: 0 }
  }
}, {
  timestamps: true
});

// Indexes
syncLogSchema.index({ status: 1, priority: -1, createdAt: 1 });
syncLogSchema.index({ collection: 1, documentId: 1, walSequence: 1 });
syncLogSchema.index({ 'clientInfo.deviceId': 1, status: 1 });

// Generate sync ID and WAL sequence
syncLogSchema.pre('save', async function(next) {
  if (!this.syncId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    this.syncId = `SYNC-${timestamp}-${random}`.toUpperCase();
  }
  
  if (!this.walSequence) {
    const lastEntry = await this.constructor.findOne()
      .sort({ walSequence: -1 })
      .select('walSequence');
    this.walSequence = (lastEntry?.walSequence || 0) + 1;
  }
  
  next();
});

// Static method to queue sync operation
syncLogSchema.statics.queue = async function(operation, collection, documentId, data, clientInfo, priority = 5) {
  const entry = new this({
    operation,
    collection,
    documentId,
    data,
    clientInfo,
    priority,
    status: 'pending',
    nextAttemptAt: new Date()
  });
  
  return entry.save();
};

// Get pending sync operations
syncLogSchema.statics.getPending = async function(limit = 100) {
  return this.find({
    status: { $in: ['pending', 'failed'] },
    attempts: { $lt: mongoose.Query.prototype.getQuery.call(this).maxAttempts || 5 },
    nextAttemptAt: { $lte: new Date() }
  })
    .sort({ priority: -1, walSequence: 1 })
    .limit(limit);
};

// Mark as processing
syncLogSchema.methods.startProcessing = async function() {
  this.status = 'processing';
  this.attempts += 1;
  this.lastAttemptAt = new Date();
  await this.save();
};

// Mark as completed
syncLogSchema.methods.complete = async function() {
  this.status = 'completed';
  this.syncedAt = new Date();
  await this.save();
};

// Mark as failed with retry
syncLogSchema.methods.fail = async function(error) {
  this.errors.push({
    message: error.message,
    code: error.code,
    timestamp: new Date(),
    stack: error.stack
  });
  
  if (this.attempts >= this.maxAttempts) {
    this.status = 'failed';
  } else {
    this.status = 'pending';
    // Exponential backoff: 1min, 2min, 4min, 8min, 16min
    const backoffMs = Math.pow(2, this.attempts) * 60 * 1000;
    this.nextAttemptAt = new Date(Date.now() + backoffMs);
  }
  
  await this.save();
};

// Handle conflict
syncLogSchema.methods.setConflict = async function(type, serverVersion) {
  this.status = 'conflict';
  this.conflict = {
    type,
    serverVersion
  };
  await this.save();
};

// Resolve conflict
syncLogSchema.methods.resolveConflict = async function(resolution, resolvedBy) {
  this.conflict.resolution = resolution;
  this.conflict.resolvedAt = new Date();
  this.conflict.resolvedBy = resolvedBy;
  this.status = 'pending'; // Re-queue for sync
  this.nextAttemptAt = new Date();
  await this.save();
};

// Transform JSON output
syncLogSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    // Truncate data for list views
    if (ret.data && Object.keys(ret.data).length > 10) {
      ret.dataPreview = Object.keys(ret.data).slice(0, 5);
      ret.dataFieldCount = Object.keys(ret.data).length;
    }
    return ret;
  }
});

const SyncLog = mongoose.model('SyncLog', syncLogSchema);

export default SyncLog;

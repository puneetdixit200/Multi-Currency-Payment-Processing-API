import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  // Action identification
  action: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['auth', 'payment', 'merchant', 'settlement', 'currency', 'admin', 'system'],
    required: true,
    index: true
  },
  // Actor information
  actor: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: String,
    role: String,
    ipAddress: String,
    userAgent: String,
    deviceId: String,
    sessionId: String
  },
  // Target resource
  resource: {
    type: {
      type: String,
      enum: ['user', 'merchant', 'payment', 'settlement', 'exchange_rate', 'config', 'system']
    },
    id: mongoose.Schema.Types.ObjectId,
    identifier: String // Human-readable identifier like transactionId
  },
  // Change tracking (immutable)
  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed
    },
    after: {
      type: mongoose.Schema.Types.Mixed
    },
    fields: [String] // List of changed field names
  },
  // Request context
  request: {
    method: String,
    path: String,
    correlationId: String,
    body: mongoose.Schema.Types.Mixed,
    query: mongoose.Schema.Types.Mixed
  },
  // Response context
  response: {
    statusCode: Number,
    success: Boolean,
    errorCode: String,
    errorMessage: String
  },
  // Compliance metadata
  compliance: {
    dataClassification: {
      type: String,
      enum: ['public', 'internal', 'confidential', 'restricted'],
      default: 'internal'
    },
    retentionDays: {
      type: Number,
      default: 2555 // 7 years for financial compliance
    },
    piiAccessed: Boolean,
    pciRelevant: Boolean
  },
  // Timing
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  duration: Number, // Request duration in ms
  // Additional context
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  tags: [String],
  // Severity for alerting
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info'
  }
}, {
  timestamps: true,
  // Make documents immutable after creation
  strict: true
});

// Indexes for compliance queries
auditLogSchema.index({ timestamp: -1, category: 1 });
auditLogSchema.index({ 'actor.userId': 1, timestamp: -1 });
auditLogSchema.index({ 'resource.type': 1, 'resource.id': 1, timestamp: -1 });
auditLogSchema.index({ 'request.correlationId': 1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });
auditLogSchema.index({ tags: 1 });

// Text index for searching
auditLogSchema.index({ 
  action: 'text', 
  'actor.email': 'text',
  'resource.identifier': 'text',
  'response.errorMessage': 'text'
});

// Prevent updates to audit logs (immutability)
auditLogSchema.pre('updateOne', function(next) {
  const error = new Error('Audit logs are immutable and cannot be modified');
  error.code = 'IMMUTABLE_DOCUMENT';
  next(error);
});

auditLogSchema.pre('findOneAndUpdate', function(next) {
  const error = new Error('Audit logs are immutable and cannot be modified');
  error.code = 'IMMUTABLE_DOCUMENT';
  next(error);
});

// Static method to create audit log entry
auditLogSchema.statics.log = async function(data) {
  const entry = new this({
    action: data.action,
    category: data.category,
    actor: data.actor,
    resource: data.resource,
    changes: data.changes,
    request: data.request,
    response: data.response,
    compliance: data.compliance,
    timestamp: data.timestamp || new Date(),
    duration: data.duration,
    metadata: data.metadata,
    tags: data.tags,
    severity: data.severity || 'info'
  });
  
  return entry.save();
};

// Static method for security-relevant log
auditLogSchema.statics.logSecurity = async function(action, actor, details, severity = 'warning') {
  return this.log({
    action,
    category: 'auth',
    actor,
    severity,
    compliance: {
      dataClassification: 'confidential'
    },
    metadata: new Map(Object.entries(details))
  });
};

// Search audit logs with filters
auditLogSchema.statics.search = async function(filters, options = {}) {
  const query = {};
  
  if (filters.startDate || filters.endDate) {
    query.timestamp = {};
    if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
    if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
  }
  
  if (filters.category) query.category = filters.category;
  if (filters.action) query.action = new RegExp(filters.action, 'i');
  if (filters.userId) query['actor.userId'] = filters.userId;
  if (filters.resourceType) query['resource.type'] = filters.resourceType;
  if (filters.resourceId) query['resource.id'] = filters.resourceId;
  if (filters.severity) query.severity = filters.severity;
  if (filters.correlationId) query['request.correlationId'] = filters.correlationId;
  if (filters.tags) query.tags = { $in: Array.isArray(filters.tags) ? filters.tags : [filters.tags] };
  
  if (filters.search) {
    query.$text = { $search: filters.search };
  }
  
  const page = parseInt(options.page) || 1;
  const limit = Math.min(parseInt(options.limit) || 50, 200);
  const skip = (page - 1) * limit;
  
  const [logs, total] = await Promise.all([
    this.find(query)
      .sort(options.sort || { timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);
  
  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Transform JSON output
auditLogSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    // Mask sensitive data in request body
    if (ret.request?.body?.password) {
      ret.request.body.password = '[REDACTED]';
    }
    return ret;
  }
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;

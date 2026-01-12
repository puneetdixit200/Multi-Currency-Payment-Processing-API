// Shared transfers store for cross-merchant visibility
// This simulates a backend database of transfers

// Fee rates by currency (percentage)
// Fee rates by currency (percentage) - Default 1.0%
let feeRates = {
  INR: 1.0,
  USD: 1.0,
  EUR: 1.0,
  GBP: 1.0,
  JPY: 1.0,
  CAD: 1.0,
  AUD: 1.0,
  CHF: 1.0,
  SGD: 1.0
}

// Initial balance for each merchant (10 Lakh = 1,000,000 INR)
const INITIAL_BALANCE = 1000000

// High-value transfer threshold (8 Lakh = 800,000 INR)
const HIGH_VALUE_THRESHOLD = 800000

// Admin alerts for high-value transfers
let alerts = []

// Idempotency keys for processed transactions (prevents duplicates)
let processedIdempotencyKeys = new Set()

// Rate limiting configuration
const RATE_LIMIT = {
  maxTransactionsPerMinute: 10,
  maxTransactionsPerHour: 50,
  windowMs: 60000 // 1 minute
}

// Rate limit tracking per merchant
let rateLimitTracking = {}

// Comprehensive error logging
let errorLogs = []

// Merchant auto-approval settings and balances
let merchantSettings = {
  'MER-001': { autoApproval: false, name: 'TechCorp Inc', initialBalance: INITIAL_BALANCE },
  'MER-002': { autoApproval: true, name: 'Global Trade Ltd', initialBalance: INITIAL_BALANCE },
  'MER-003': { autoApproval: false, name: 'Euro Imports', initialBalance: INITIAL_BALANCE },
  'MER-004': { autoApproval: false, name: 'Quick Pay Services', initialBalance: INITIAL_BALANCE },
  'MER-005': { autoApproval: false, name: 'North Bay Exports', initialBalance: INITIAL_BALANCE },
}

const initialTransfers = [
  { id: 'TRF-001', fromMerchant: 'MER-001', fromName: 'TechCorp Inc', toMerchant: 'MER-002', toName: 'Global Trade Ltd', amount: 150000, currency: 'INR', fee: 750, feeRate: 0.5, status: 'completed', approvalStatus: 'approved', date: '2024-01-10', note: 'Invoice payment', batchId: 'BATCH-001' },
  { id: 'TRF-002', fromMerchant: 'MER-001', fromName: 'TechCorp Inc', toMerchant: 'MER-003', toName: 'Euro Imports', amount: 2500, currency: 'USD', fee: 25, feeRate: 1.0, status: 'pending', approvalStatus: 'pending', date: '2024-01-11', note: 'Supplier payment', batchId: null },
  { id: 'TRF-003', fromMerchant: 'MER-002', fromName: 'Global Trade Ltd', toMerchant: 'MER-001', toName: 'TechCorp Inc', amount: 1800, currency: 'EUR', fee: 18, feeRate: 1.0, status: 'completed', approvalStatus: 'auto-approved', date: '2024-01-09', note: 'Settlement', batchId: 'BATCH-001' },
  { id: 'TRF-004', fromMerchant: 'MER-003', fromName: 'Euro Imports', toMerchant: 'MER-002', toName: 'Global Trade Ltd', amount: 85000, currency: 'INR', fee: 425, feeRate: 0.5, status: 'completed', approvalStatus: 'approved', date: '2024-01-08', note: 'Payment', batchId: 'BATCH-001' },
  { id: 'TRF-005', fromMerchant: 'MER-002', fromName: 'Global Trade Ltd', toMerchant: 'MER-003', toName: 'Euro Imports', amount: 3200, currency: 'GBP', fee: 38.4, feeRate: 1.2, status: 'pending', approvalStatus: 'pending', date: '2024-01-07', note: 'Pending approval', batchId: null },
]

// Settlement batches
let settlementBatches = [
  { id: 'BATCH-001', date: '2024-01-10', status: 'settled', totalAmount: 236800, transferCount: 3, settledAt: '2024-01-10T18:00:00Z' }
]

// Simple in-memory store with listeners
let transfers = [...initialTransfers]
let listeners = []
let settingsListeners = []
let feeListeners = []

export const transfersStore = {
  getTransfers: () => transfers,
  
  // Get pending approval transfers (for admin)
  getPendingApprovals: () => {
    return transfers.filter(t => t.approvalStatus === 'pending')
  },
  
  // Get transfers for a specific merchant (sent or received)
  getTransfersForMerchant: (merchantId) => {
    return transfers.filter(t => t.fromMerchant === merchantId || t.toMerchant === merchantId)
  },
  
  // Get only sent transfers
  getSentTransfers: (merchantId) => {
    return transfers.filter(t => t.fromMerchant === merchantId)
  },
  
  // Get only received transfers (money coming to me)
  getReceivedTransfers: (merchantId) => {
    return transfers.filter(t => t.toMerchant === merchantId)
  },

  // Get money requests sent to me (I am the payer = fromMerchant)
  getIncomingRequests: (merchantId) => {
    return transfers.filter(t => t.fromMerchant === merchantId && t.status === 'requested')
  },
  
  // Calculate fee for a transfer
  calculateFee: (amount, currency) => {
    const rate = feeRates[currency] || 1.0
    return {
      fee: parseFloat((amount * rate / 100).toFixed(2)),
      feeRate: rate
    }
  },
  
  // Check if merchant has auto-approval
  hasAutoApproval: (merchantId) => {
    return merchantSettings[merchantId]?.autoApproval || false
  },
  
  // Get merchant settings
  getMerchantSettings: () => merchantSettings,
  
  // Update merchant auto-approval setting
  setAutoApproval: (merchantId, enabled) => {
    if (merchantSettings[merchantId]) {
      // Create a shallow copy of the main object and the specific merchant object
      // This ensures React sees a new reference and triggers a re-render
      merchantSettings = {
        ...merchantSettings,
        [merchantId]: {
          ...merchantSettings[merchantId],
          autoApproval: enabled
        }
      }
      settingsListeners.forEach(listener => listener(merchantSettings))
    }
  },
  
  // Subscribe to settings changes
  subscribeSettings: (listener) => {
    settingsListeners.push(listener)
    // Send current settings immediately upon subscription
    listener(merchantSettings)
    return () => {
      settingsListeners = settingsListeners.filter(l => l !== listener)
    }
  },

  // Get current fee rates
  getFeeRates: () => feeRates,

  // Update fee rate for a currency
  updateFeeRate: (currency, newRate) => {
    feeRates = { ...feeRates, [currency]: parseFloat(newRate) }
    feeListeners.forEach(listener => listener(feeRates))
  },

  // Subscribe to fee changes
  subscribeFees: (listener) => {
    feeListeners.push(listener)
    listener(feeRates)
    return () => {
      feeListeners = feeListeners.filter(l => l !== listener)
    }
  },
  
  // Add a new transfer (with fee calculation and approval check)
  addTransfer: (transfer) => {
    const merchantId = transfer.fromMerchant
    const now = Date.now()
    
    // Initialize rate limit tracking for merchant
    if (!rateLimitTracking[merchantId]) {
      rateLimitTracking[merchantId] = { timestamps: [], blocked: false }
    }
    
    // Clean old timestamps (older than 1 minute)
    rateLimitTracking[merchantId].timestamps = rateLimitTracking[merchantId].timestamps.filter(
      ts => now - ts < RATE_LIMIT.windowMs
    )
    
    // Check rate limit
    if (rateLimitTracking[merchantId].timestamps.length >= RATE_LIMIT.maxTransactionsPerMinute) {
      const error = {
        id: `ERR-${String(errorLogs.length + 1).padStart(4, '0')}`,
        type: 'RATE_LIMIT_EXCEEDED',
        merchantId,
        message: `Rate limit exceeded: Max ${RATE_LIMIT.maxTransactionsPerMinute} transactions per minute`,
        timestamp: new Date().toISOString(),
        severity: 'warning'
      }
      errorLogs = [error, ...errorLogs]
      return { error: true, message: `Rate limit exceeded. Please wait before making more transactions. (Max ${RATE_LIMIT.maxTransactionsPerMinute}/min)` }
    }
    
    // Generate idempotency key if not provided
    const idempotencyKey = transfer.idempotencyKey || 
      `${transfer.fromMerchant}-${transfer.toMerchant}-${transfer.amount}-${transfer.currency}-${Date.now()}`
    
    // Check for duplicate transaction (idempotent handling)
    if (processedIdempotencyKeys.has(idempotencyKey)) {
      // Log duplicate attempt
      errorLogs = [{
        id: `ERR-${String(errorLogs.length + 1).padStart(4, '0')}`,
        type: 'DUPLICATE_TRANSACTION',
        merchantId,
        idempotencyKey,
        message: 'Duplicate transaction attempt blocked',
        timestamp: new Date().toISOString(),
        severity: 'info'
      }, ...errorLogs]
      
      // Return existing transaction with same key
      const existingTransfer = transfers.find(t => t.idempotencyKey === idempotencyKey)
      if (existingTransfer) {
        return { ...existingTransfer, isDuplicate: true, message: 'Transaction already processed (idempotent)' }
      }
    }
    
    // Check sender's current balance first
    const senderStats = transfersStore.getMerchantStats(transfer.fromMerchant)
    const senderBalance = senderStats.currentBalance || INITIAL_BALANCE
    
    // Prevent negative balance
    if (transfer.amount > senderBalance) {
      return { error: true, message: `Insufficient balance. You have ₹${senderBalance.toLocaleString('en-IN')} but trying to send ₹${transfer.amount.toLocaleString('en-IN')}` }
    }
    
    const { fee, feeRate } = transfersStore.calculateFee(transfer.amount, transfer.currency)
    const hasAutoApprove = transfersStore.hasAutoApproval(transfer.fromMerchant)
    
    // Check if high-value transfer (>8 Lakh)
    const isHighValue = transfer.amount >= HIGH_VALUE_THRESHOLD
    
    const newTransfer = {
      ...transfer,
      id: `TRF-${String(transfers.length + 1).padStart(3, '0')}`,
      idempotencyKey,
      fee,
      feeRate,
      status: hasAutoApprove ? 'completed' : 'pending',
      approvalStatus: hasAutoApprove ? 'auto-approved' : 'pending',
      batchId: null,
      isHighValue,
      processedAt: new Date().toISOString()
    }
    
    // Track idempotency key
    processedIdempotencyKeys.add(idempotencyKey)
    
    // Add alert for high-value transfers
    if (isHighValue) {
      alerts = [{
        id: `ALERT-${String(alerts.length + 1).padStart(3, '0')}`,
        type: 'high_value',
        transferId: newTransfer.id,
        message: `High-value transfer of ₹${transfer.amount.toLocaleString('en-IN')} from ${transfer.fromName}`,
        amount: transfer.amount,
        fromMerchant: transfer.fromMerchant,
        fromName: transfer.fromName,
        toMerchant: transfer.toMerchant,
        toName: transfer.toName,
        timestamp: new Date().toISOString(),
        read: false
      }, ...alerts]
    }
    
    transfers = [newTransfer, ...transfers]
    
    // Track rate limit timestamp for successful transaction
    if (rateLimitTracking[transfer.fromMerchant]) {
      rateLimitTracking[transfer.fromMerchant].timestamps.push(Date.now())
    }
    
    listeners.forEach(listener => listener(transfers))
    return newTransfer
  },
  
  // Approve a transfer (admin action)
  approveTransfer: (transferId) => {
    transfers = transfers.map(t => {
      if (t.id === transferId) {
        return { ...t, approvalStatus: 'approved', status: 'completed' }
      }
      return t
    })
    listeners.forEach(listener => listener(transfers))
  },
  
  // Reject a transfer (admin action)
  rejectTransfer: (transferId, reason) => {
    transfers = transfers.map(t => {
      if (t.id === transferId) {
        return { ...t, approvalStatus: 'rejected', status: 'failed', rejectionReason: reason }
      }
      return t
    })
    listeners.forEach(listener => listener(transfers))
  },

  // Request money from another merchant
  requestTransfer: (transfer) => {
    // Generate idempotency key for request
    const idempotencyKey = transfer.idempotencyKey || 
      `REQ-${transfer.fromMerchant}-${transfer.toMerchant}-${transfer.amount}-${transfer.currency}-${Date.now()}`
    
    // Check for duplicate request (idempotent handling)
    if (processedIdempotencyKeys.has(idempotencyKey)) {
      const existingTransfer = transfers.find(t => t.idempotencyKey === idempotencyKey)
      if (existingTransfer) {
        return { ...existingTransfer, isDuplicate: true, message: 'Request already submitted (idempotent)' }
      }
    }
    
    const { fee, feeRate } = transfersStore.calculateFee(transfer.amount, transfer.currency)
    
    // In a request: 
    // fromMerchant = Payer (Target)
    // toMerchant = Requester (Me)
    const newTransfer = {
      ...transfer,
      id: `REQ-${String(transfers.length + 1).padStart(3, '0')}`,
      idempotencyKey,
      fee,
      feeRate,
      status: 'requested',
      approvalStatus: 'pending_merchant', // Waiting for Payer to approve
      batchId: null,
      processedAt: new Date().toISOString()
    }
    
    // Track idempotency key
    processedIdempotencyKeys.add(idempotencyKey)
    
    transfers = [newTransfer, ...transfers]
    listeners.forEach(listener => listener(transfers))
    return newTransfer
  },

  // Approve a money request (Merchant action - effectively sending money)
  approveRequest: (transferId) => {
    // Find the original transfer to check auto-approval logic for the payer
    const transfer = transfers.find(t => t.id === transferId)
    if (!transfer) return

    const hasAutoApprove = transfersStore.hasAutoApproval(transfer.fromMerchant) // The Payer
    
    transfers = transfers.map(t => {
      if (t.id === transferId) {
        return { 
          ...t, 
          // If auto-approved -> completed, else -> pending (admin)
          status: hasAutoApprove ? 'completed' : 'pending',
          approvalStatus: hasAutoApprove ? 'auto-approved' : 'pending',
          date: new Date().toISOString().split('T')[0] // Update date to approval date
        }
      }
      return t
    })
    listeners.forEach(listener => listener(transfers))
  },

  // Decline a money request
  declineRequest: (transferId) => {
    transfers = transfers.map(t => {
      if (t.id === transferId) {
        return { 
          ...t, 
          status: 'failed', 
          approvalStatus: 'rejected',
          rejectionReason: 'Declined by merchant'
        }
      }
      return t
    })
    listeners.forEach(listener => listener(transfers))
  },
  
  // Create settlement batch
  createSettlementBatch: () => {
    const completedUnbatched = transfers.filter(t => t.status === 'completed' && !t.batchId)
    if (completedUnbatched.length === 0) return { success: false, count: 0 }
    
    const batchId = `BATCH-${String(settlementBatches.length + 1).padStart(3, '0')}`
    const totalAmount = completedUnbatched.reduce((sum, t) => sum + t.amount, 0)
    
    const batch = {
      id: batchId,
      date: new Date().toISOString().split('T')[0],
      status: 'settled',
      totalAmount,
      transferCount: completedUnbatched.length,
      settledAt: new Date().toISOString()
    }
    
    settlementBatches = [...settlementBatches, batch]
    transfers = transfers.map(t => {
      if (completedUnbatched.find(ct => ct.id === t.id)) {
        return { ...t, batchId }
      }
      return t
    })
    
    listeners.forEach(listener => listener(transfers))
    return { success: true, batch }
  },
  
  // Get settlement batches
  getSettlementBatches: () => settlementBatches,
  
  // Subscribe to changes
  subscribe: (listener) => {
    listeners.push(listener)
    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  },
  
  // Calculate totals for a merchant
  getMerchantStats: (merchantId) => {
    const initialBalance = merchantSettings[merchantId]?.initialBalance || INITIAL_BALANCE
    const sent = transfers.filter(t => t.fromMerchant === merchantId && t.status === 'completed')
    const received = transfers.filter(t => t.toMerchant === merchantId && t.status === 'completed')
    const pending = transfers.filter(t => (t.fromMerchant === merchantId || t.toMerchant === merchantId) && t.approvalStatus === 'pending')
    
    // Total Sent = Sum of Amount (User A sent 100)
    const totalSent = sent.reduce((sum, t) => sum + t.amount, 0)
    
    // Total Received = Sum of (Amount - Fee) (User B receives 99.5)
    // "cut the fee and deliver rest amount to merchant"
    const totalReceived = received.reduce((sum, t) => sum + (t.amount - (t.fee || 0)), 0)
    
    // Pending depends on direction
    const totalPending = pending.reduce((sum, t) => {
      if (t.fromMerchant === merchantId) return sum + t.amount
      if (t.toMerchant === merchantId) return sum + (t.amount - (t.fee || 0))
      return sum
    }, 0)
    
    // Current Balance = Initial Balance + Received - Sent
    const currentBalance = initialBalance + totalReceived - totalSent
    
    return {
      initialBalance,
      currentBalance,
      totalSent,
      totalReceived, // Net amount received
      totalPending,
      netBalance: totalReceived - totalSent,
      sentCount: sent.length,
      receivedCount: received.length,
      pendingCount: pending.length
    }
  },
  
  // Get admin dashboard stats
  getAdminStats: () => {
    const pending = transfers.filter(t => t.approvalStatus === 'pending')
    const approved = transfers.filter(t => t.approvalStatus === 'approved' || t.approvalStatus === 'auto-approved')
    const rejected = transfers.filter(t => t.approvalStatus === 'rejected')
    const totalFees = transfers.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.fee || 0), 0)
    const totalVolume = transfers.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0)
    
    return {
      pendingCount: pending.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      totalFees,
      totalVolume,
      autoApprovedCount: transfers.filter(t => t.approvalStatus === 'auto-approved').length
    }
  },

  // API Data Export - Returns all merchant balances for external services
  getAPIData: () => {
    const merchantIds = Object.keys(merchantSettings)
    const merchants = merchantIds.map(id => {
      const stats = transfersStore.getMerchantStats(id)
      return {
        merchantId: id,
        merchantName: merchantSettings[id].name,
        initialBalance: stats.initialBalance,
        currentBalance: stats.currentBalance,
        totalSent: stats.totalSent,
        totalReceived: stats.totalReceived,
        pendingAmount: stats.totalPending,
        currency: 'INR',
        lastUpdated: new Date().toISOString()
      }
    })
    
    return {
      apiVersion: '1.0',
      timestamp: new Date().toISOString(),
      totalMerchants: merchants.length,
      merchants
    }
  },

  // Get admin alerts (high-value transfers, etc.)
  getAlerts: () => alerts,

  // Mark alert as read
  markAlertRead: (alertId) => {
    alerts = alerts.map(a => a.id === alertId ? { ...a, read: true } : a)
  },

  // Get unread alert count
  getUnreadAlertCount: () => alerts.filter(a => !a.read).length,

  // Get comprehensive error logs
  getErrorLogs: () => errorLogs,

  // Get rate limit status for a merchant
  getRateLimitStatus: (merchantId) => {
    const tracking = rateLimitTracking[merchantId] || { timestamps: [] }
    const now = Date.now()
    const recentTransactions = tracking.timestamps.filter(ts => now - ts < RATE_LIMIT.windowMs).length
    return {
      currentCount: recentTransactions,
      maxAllowed: RATE_LIMIT.maxTransactionsPerMinute,
      remaining: Math.max(0, RATE_LIMIT.maxTransactionsPerMinute - recentTransactions),
      resetInSeconds: recentTransactions > 0 ? Math.ceil((tracking.timestamps[0] + RATE_LIMIT.windowMs - now) / 1000) : 0
    }
  },

  // Clear error logs (admin action)
  clearErrorLogs: () => { errorLogs = [] }
}

export const currencySymbols = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: 'C$', AUD: 'A$', CHF: 'CHF', SGD: 'S$'
}

export const currencies = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'SGD']

export const FEE_RATES_EXPORT = feeRates

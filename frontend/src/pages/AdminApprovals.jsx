import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Clock, AlertTriangle, Settings, ToggleLeft, ToggleRight, DollarSign, TrendingUp, Receipt, Building2, Code, Copy, Check, Bell } from 'lucide-react'
import { transfersStore, currencySymbols } from '../stores/transfersStore'
import { mockMerchants } from './Merchants'

export default function AdminApprovals() {
  const [pendingTransfers, setPendingTransfers] = useState([])
  const [merchantSettings, setMerchantSettings] = useState({})
  const [adminStats, setAdminStats] = useState({})
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [feeRates, setFeeRates] = useState({})
  const [showFeeModal, setShowFeeModal] = useState(false)
  const [showAPIModal, setShowAPIModal] = useState(false)
  const [copiedAPI, setCopiedAPI] = useState(false)
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    const updateData = () => {
      setPendingTransfers(transfersStore.getPendingApprovals())
      setAdminStats(transfersStore.getAdminStats())
      setMerchantSettings(transfersStore.getMerchantSettings())
      setAlerts(transfersStore.getAlerts())
    }
    
    updateData()
    const unsubscribe = transfersStore.subscribe(updateData)
    const unsubSettings = transfersStore.subscribeSettings(setMerchantSettings)
    const unsubFees = transfersStore.subscribeFees(setFeeRates)
    return () => {
      unsubscribe()
      unsubSettings()
      unsubFees()
    }
  }, [])

  const handleApprove = (transferId) => {
    transfersStore.approveTransfer(transferId)
  }

  const handleReject = () => {
    if (rejectModal && rejectReason.trim()) {
      transfersStore.rejectTransfer(rejectModal.id, rejectReason)
      setRejectModal(null)
      setRejectReason('')
    }
  }

  const toggleAutoApproval = (merchantId) => {
    const current = merchantSettings[merchantId]?.autoApproval || false
    transfersStore.setAutoApproval(merchantId, !current)
  }

  const handleCreateBatch = () => {
    const result = transfersStore.createSettlementBatch()
    if (result && result.success) {
      alert(`Settlement Batch Created! \n\nBatch ID: ${result.batch.id}\nTransfers: ${result.batch.transferCount}\nTotal: ₹${result.batch.totalAmount.toLocaleString('en-IN')}`)
    } else {
      alert('No completed transfers to batch.\n\nOnly "Completed" transfers (approved by admin) can be settled.')
    }
  }

  const handleCopyAPI = () => {
    const apiData = transfersStore.getAPIData()
    navigator.clipboard.writeText(JSON.stringify(apiData, null, 2))
    setCopiedAPI(true)
    setTimeout(() => setCopiedAPI(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Approvals</h1>
          <p className="text-gray-400">Review and approve merchant transfers</p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
          >
            <Settings className="w-5 h-5" />
            Auto-Approval Settings
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAPIModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
          >
            <Code className="w-5 h-5" />
            API Access
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowFeeModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
          >
            <DollarSign className="w-5 h-5" />
            Fee Settings
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateBatch}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl font-medium"
          >
            <Receipt className="w-5 h-5" />
            Create Settlement Batch
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Pending Approval</span>
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-yellow-400">{adminStats.pendingCount || 0}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Approved</span>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-400">{adminStats.approvedCount || 0}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Auto-Approved</span>
            <ToggleRight className="w-5 h-5 text-accent-400" />
          </div>
          <p className="text-2xl font-bold text-accent-400">{adminStats.autoApprovedCount || 0}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Volume</span>
            <TrendingUp className="w-5 h-5 text-primary-400" />
          </div>
          <p className="text-2xl font-bold">₹{(adminStats.totalVolume || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Fees Collected</span>
            <DollarSign className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">₹{(adminStats.totalFees || 0).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* High-Value Alerts */}
      {alerts.length > 0 && (
        <div className="glass-card overflow-hidden border-l-4 border-l-orange-500">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-orange-500/10">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-orange-400" />
              <div>
                <h2 className="text-lg font-bold text-orange-400">High-Value Transfer Alerts</h2>
                <p className="text-sm text-gray-400">Transfers exceeding ₹8,00,000 require attention</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
              {alerts.filter(a => !a.read).length} Unread
            </span>
          </div>
          <div className="divide-y divide-white/10">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-4 flex items-center justify-between transition-colors ${alert.read ? 'bg-white/5' : 'bg-orange-500/5'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${alert.read ? 'bg-white/10' : 'bg-orange-500/20'}`}>
                    <AlertTriangle className={`w-6 h-6 ${alert.read ? 'text-gray-400' : 'text-orange-400'}`} />
                  </div>
                  <div>
                    <p className="font-bold">
                      ₹{alert.amount.toLocaleString('en-IN')} 
                      <span className="text-gray-400 font-normal ml-2">from {alert.fromName} → {alert.toName}</span>
                    </p>
                    <p className="text-sm text-gray-500">Transfer ID: {alert.transferId}</p>
                    <p className="text-xs text-gray-600 mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                {!alert.read && (
                  <button
                    onClick={() => transfersStore.markAlertRead(alert.id)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium transition-colors"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Approvals Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Pending Approvals</h2>
            <p className="text-sm text-gray-400">{pendingTransfers.length} transfers awaiting review</p>
          </div>
        </div>
        
        {pendingTransfers.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
            <p>All transfers have been reviewed!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-gray-400 font-medium">Transfer ID</th>
                  <th className="text-left p-4 text-gray-400 font-medium">From</th>
                  <th className="text-left p-4 text-gray-400 font-medium">To</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Amount</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Fee</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Date</th>
                  <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingTransfers.map((transfer, idx) => (
                  <motion.tr
                    key={transfer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-mono text-primary-300">{transfer.id}</span>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-semibold">{transfer.fromName}</p>
                        <p className="text-sm text-gray-400 font-mono">{transfer.fromMerchant}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-semibold">{transfer.toName}</p>
                        <p className="text-sm text-gray-400 font-mono">{transfer.toMerchant}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold">
                        {currencySymbols[transfer.currency]}{transfer.amount.toLocaleString('en-IN')} 
                        <span className="text-xs text-gray-400 ml-1">{transfer.currency}</span>
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-amber-400">
                        {currencySymbols[transfer.currency]}{transfer.fee?.toLocaleString('en-IN') || 0}
                        <span className="text-xs text-gray-400 ml-1">({transfer.feeRate}%)</span>
                      </span>
                    </td>
                    <td className="p-4 text-gray-400">{transfer.date}</td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-end">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleApprove(transfer.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setRejectModal(transfer)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Auto-Approval Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSettingsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-lg"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Auto-Approval Settings</h2>
                <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-gray-400 text-sm mb-4">
                Enable auto-approval for trusted merchants. Their transfers will be automatically approved without manual review.
              </p>
              
              <div className="space-y-3">
                {mockMerchants.map(merchant => (
                  <div key={merchant.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-primary-400" />
                      <div>
                        <p className="font-medium">{merchant.name}</p>
                        <p className="text-sm text-gray-400 font-mono">{merchant.id}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleAutoApproval(merchant.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        merchantSettings[merchant.id]?.autoApproval 
                          ? 'bg-accent-500/20 text-accent-400' 
                          : 'bg-white/5 text-gray-400'
                      }`}
                    >
                      {merchantSettings[merchant.id]?.autoApproval 
                        ? <ToggleRight className="w-6 h-6" /> 
                        : <ToggleLeft className="w-6 h-6" />
                      }
                    </button>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fee Settings Modal */}
      <AnimatePresence>
        {showFeeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFeeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-lg"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Transaction Fee Settings</h2>
                <button onClick={() => setShowFeeModal(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-gray-400 text-sm mb-4">
                Set custom fee percentages for each currency. Default base rate is 1.0%.
              </p>
              
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {Object.entries(feeRates).map(([currency, rate]) => (
                  <div key={currency} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                        {currencySymbols[currency]}
                      </div>
                      <div>
                        <p className="font-medium">{currency}</p>
                        <p className="text-sm text-gray-400 font-mono">Current: {rate}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        step="0.1" 
                        min="0"
                        defaultValue={rate}
                        onBlur={(e) => transfersStore.updateFeeRate(currency, e.target.value)}
                        className="w-20 px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-right focus:border-amber-500 focus:outline-none transition-colors"
                      />
                      <span className="text-gray-400">%</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setShowFeeModal(false)}
                className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setRejectModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-md"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="text-xl font-bold">Reject Transfer</h2>
              </div>
              
              <p className="text-gray-400 text-sm mb-4">
                Please provide a reason for rejecting transfer <span className="font-mono text-primary-300">{rejectModal.id}</span>
              </p>
              
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-red-500 focus:outline-none transition-colors resize-none h-24"
              />
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setRejectModal(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleReject}
                  disabled={!rejectReason.trim()}
                  className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium disabled:opacity-50"
                >
                  Confirm Rejection
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Access Modal */}
      <AnimatePresence>
        {showAPIModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAPIModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-3xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    <Code className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">API Access</h2>
                    <p className="text-sm text-gray-400">Share merchant balance data with external services</p>
                  </div>
                </div>
                <button onClick={() => setShowAPIModal(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">API Endpoint (Simulated)</span>
                  <span className="text-xs text-accent-400 font-mono bg-accent-500/10 px-2 py-1 rounded">GET /api/v1/merchants/balances</span>
                </div>
                <div className="bg-black/30 rounded-xl p-4 font-mono text-sm overflow-auto max-h-[50vh] border border-white/10">
                  <pre className="text-green-400 whitespace-pre-wrap">{JSON.stringify(transfersStore.getAPIData(), null, 2)}</pre>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleCopyAPI}
                  className="flex-1 py-3 bg-accent-500/20 hover:bg-accent-500/30 text-accent-400 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  {copiedAPI ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedAPI ? 'Copied!' : 'Copy JSON Response'}
                </button>
                <button
                  onClick={() => setShowAPIModal(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, ArrowRight, Check, Clock, Building2, IndianRupee } from 'lucide-react'
import { useAuth } from '../App'
import { mockMerchants } from './Merchants'
import { transfersStore, currencies, currencySymbols } from '../stores/transfersStore'

export default function SendMoney() {
  const { user } = useAuth()
  const [transfers, setTransfers] = useState([])
  const [activeTab, setActiveTab] = useState('send') // 'send' or 'request'
  const [showForm, setShowForm] = useState(false)
  const [newTransfer, setNewTransfer] = useState({
    toMerchant: '',
    amount: '',
    currency: 'INR',
    note: ''
  })

  // Load sent transfers from shared store
  useEffect(() => {
    const updateTransfers = () => {
      if (user?.merchantId) {
        setTransfers(transfersStore.getSentTransfers(user.merchantId))
      }
    }
    updateTransfers()
    const unsubscribe = transfersStore.subscribe(updateTransfers)
    return () => unsubscribe()
  }, [user?.merchantId])

  // Filter out current merchant from transfer options
  const otherMerchants = mockMerchants.filter(m => m.id !== user?.merchantId)

  const handleSendMoney = (e) => {
    e.preventDefault()
    const selectedMerchant = mockMerchants.find(m => m.id === newTransfer.toMerchant)
    
    // Generate unique idempotency key for this transaction
    const idempotencyKey = `${user?.merchantId}-${newTransfer.toMerchant}-${newTransfer.amount}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const transfer = {
      fromMerchant: user?.merchantId,
      fromName: user?.merchantName,
      toMerchant: newTransfer.toMerchant,
      toName: selectedMerchant?.name || 'Unknown',
      amount: parseFloat(newTransfer.amount),
      currency: newTransfer.currency,
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      note: newTransfer.note,
      idempotencyKey
    }

    if (activeTab === 'send') {
      const result = transfersStore.addTransfer(transfer)
      if (result?.error) {
        alert(result.message)
        return
      }
      if (result?.isDuplicate) {
        alert('This transaction was already processed.')
        return
      }
    } else {
      const result = transfersStore.requestTransfer(transfer)
      if (result?.isDuplicate) {
        alert('This request was already submitted.')
        return
      }
    }
    
    setShowForm(false)
    setNewTransfer({ toMerchant: '', amount: '', currency: 'INR', note: '' })
  }

  const totalSent = transfers.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0)
  const pendingAmount = transfers.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Send Money</h1>
          <p className="text-gray-400">Transfer funds to other merchants</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl font-medium hover:shadow-lg hover:shadow-accent-500/25 transition-all"
        >
          {activeTab === 'send' ? <Send className="w-5 h-5" /> : <ArrowRight className="w-5 h-5 rotate-180" />}
          {activeTab === 'send' ? 'New Transfer' : 'New Request'}
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10">
        <button
          onClick={() => setActiveTab('send')}
          className={`pb-3 px-2 font-medium transition-colors relative ${
            activeTab === 'send' ? 'text-accent-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          Send Money
          {activeTab === 'send' && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('request')}
          className={`pb-3 px-2 font-medium transition-colors relative ${
            activeTab === 'request' ? 'text-accent-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          Request Money
          {activeTab === 'request' && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-400" />
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-gray-400 text-sm">Your Merchant ID</p>
          <p className="text-xl font-bold mt-1 font-mono text-primary-300">{user?.merchantId || 'N/A'}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-gray-400 text-sm">Total Transferred</p>
          <p className="text-2xl font-bold mt-1 text-accent-400">₹{totalSent.toLocaleString('en-IN')}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-gray-400 text-sm">Pending Transfers</p>
          <p className="text-2xl font-bold mt-1 text-yellow-400">₹{pendingAmount.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Transfer History */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold">Transfer History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-gray-400 font-medium">Transfer ID</th>
                <th className="text-left p-4 text-gray-400 font-medium">To Merchant</th>
                <th className="text-left p-4 text-gray-400 font-medium">Amount</th>
                <th className="text-left p-4 text-gray-400 font-medium">Note</th>
                <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                <th className="text-left p-4 text-gray-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((transfer, idx) => (
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
                      <p className="font-semibold">{transfer.toName}</p>
                      <p className="text-sm text-gray-400 font-mono">{transfer.toMerchant}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-semibold">{currencySymbols[transfer.currency] || transfer.currency}{transfer.amount.toLocaleString('en-IN')} <span className="text-xs text-gray-400">{transfer.currency}</span></span>
                  </td>
                  <td className="p-4 text-gray-400">{transfer.note || '-'}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${
                      transfer.status === 'completed' 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    }`}>
                      {transfer.status === 'completed' ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400">{transfer.date}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send/Request Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center">
                    {activeTab === 'send' ? <Send className="w-5 h-5 text-white" /> : <ArrowRight className="w-5 h-5 text-white rotate-180" />}
                  </div>
                  <h2 className="text-xl font-bold">{activeTab === 'send' ? 'Send Money' : 'Request Money'}</h2>
                </div>
              </div>

              <form onSubmit={handleSendMoney} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    {activeTab === 'send' ? 'From (Your Account)' : 'Requester (You)'}
                  </label>
                  <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-primary-400" />
                      <div>
                        <p className="font-semibold">{user?.merchantName || 'Your Merchant'}</p>
                        <p className="text-sm text-gray-400 font-mono">{user?.merchantId}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    {activeTab === 'send' ? 'To Merchant' : 'Request From'}
                  </label>
                  <select
                    value={newTransfer.toMerchant}
                    onChange={(e) => setNewTransfer(t => ({ ...t, toMerchant: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-accent-500 focus:outline-none transition-colors"
                    required
                  >
                    <option value="">-- Select Recipient --</option>
                    {otherMerchants.map(m => (
                      <option key={m.id} value={m.id}>{m.id} - {m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={newTransfer.amount}
                      onChange={(e) => setNewTransfer(t => ({ ...t, amount: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-accent-500 focus:outline-none transition-colors"
                      placeholder="Enter amount"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Currency</label>
                    <select
                      value={newTransfer.currency}
                      onChange={(e) => setNewTransfer(t => ({ ...t, currency: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-accent-500 focus:outline-none transition-colors"
                    >
                      {currencies.map(c => (
                        <option key={c} value={c}>{c} ({currencySymbols[c]})</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Fee Display - Only show for Send, requests calculate fee later */}
                {activeTab === 'send' && newTransfer.amount && (
                  <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between text-sm">
                    <span className="text-gray-400">Transaction Fee</span>
                    <span className="text-amber-400 font-mono">
                      {currencySymbols[newTransfer.currency]}
                      {transfersStore.calculateFee(newTransfer.amount, newTransfer.currency).fee.toLocaleString('en-IN')}
                      <span className="text-gray-500 ml-1">({transfersStore.calculateFee(newTransfer.amount, newTransfer.currency).feeRate}%)</span>
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Note (Optional)</label>
                  <input
                    type="text"
                    value={newTransfer.note}
                    onChange={(e) => setNewTransfer(t => ({ ...t, note: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-accent-500 focus:outline-none transition-colors"
                    placeholder="Payment for invoice #123"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    {activeTab === 'send' ? <Send className="w-4 h-4" /> : <ArrowRight className="w-4 h-4 rotate-180" />}
                    {activeTab === 'send' ? 'Send Money' : 'Request Funds'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

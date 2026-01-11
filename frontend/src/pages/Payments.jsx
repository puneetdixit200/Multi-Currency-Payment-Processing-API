import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Filter, Eye, RotateCcw, ChevronDown } from 'lucide-react'
import { useAuth } from '../App'

const statusColors = {
  initiated: 'bg-blue-500/20 text-blue-400',
  processing: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
  settled: 'bg-purple-500/20 text-purple-400'
}

export default function Payments() {
  const { token } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState({ status: '', search: '' })

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/v1/payments', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setPayments(data.payments || [])
    } catch {
      // Mock data
      setPayments([
        { _id: '1', transactionId: 'TXN-ABC123', sourceAmount: 5000, sourceCurrency: 'USD', targetCurrency: 'EUR', status: 'completed', createdAt: new Date().toISOString() },
        { _id: '2', transactionId: 'TXN-DEF456', sourceAmount: 3200, sourceCurrency: 'GBP', targetCurrency: 'JPY', status: 'processing', createdAt: new Date().toISOString() },
        { _id: '3', transactionId: 'TXN-GHI789', sourceAmount: 8500, sourceCurrency: 'EUR', targetCurrency: 'USD', status: 'completed', createdAt: new Date().toISOString() },
        { _id: '4', transactionId: 'TXN-JKL012', sourceAmount: 1200, sourceCurrency: 'USD', targetCurrency: 'CAD', status: 'initiated', createdAt: new Date().toISOString() },
      ])
    } finally {
      setLoading(false)
    }
  }

  const filteredPayments = payments.filter(p => {
    if (filter.status && p.status !== filter.status) return false
    if (filter.search && !p.transactionId.toLowerCase().includes(filter.search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-gray-400">Manage and track all payment transactions</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl font-medium hover:shadow-lg hover:shadow-primary-500/25 transition-all"
        >
          <Plus className="w-5 h-5" />
          New Payment
        </motion.button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by transaction ID..."
            value={filter.search}
            onChange={(e) => setFilter(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
          />
        </div>
        <select
          value={filter.status}
          onChange={(e) => setFilter(f => ({ ...f, status: e.target.value }))}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="initiated">Initiated</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="settled">Settled</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Transaction ID</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Amount</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Currency</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Date</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPayments.map((payment, idx) => (
                <motion.tr
                  key={payment._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono font-medium">{payment.transactionId}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold">${payment.sourceAmount.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-primary-400">{payment.sourceCurrency}</span>
                    <span className="text-gray-500 mx-2">→</span>
                    <span className="text-accent-400">{payment.targetCurrency}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[payment.status]}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-md"
            >
              <h2 className="text-2xl font-bold mb-6">Create Payment</h2>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Amount</label>
                  <input type="number" className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">From Currency</label>
                    <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                      <option>USD</option><option>EUR</option><option>GBP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">To Currency</label>
                    <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                      <option>EUR</option><option>USD</option><option>GBP</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 bg-white/10 rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-primary-500 rounded-xl font-medium">Create</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

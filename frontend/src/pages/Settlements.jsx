import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Receipt, Search, Plus, X, Check, Clock, DollarSign, Download, Eye, Play, Pause } from 'lucide-react'

const mockSettlements = [
  { id: 'SET-001', merchantId: 'MER-001', merchant: 'TechCorp Inc', amount: 3768325.00, currency: 'INR', status: 'completed', settledAt: '2024-01-10', transactions: 156 },
  { id: 'SET-002', merchantId: 'MER-002', merchant: 'Global Trade Ltd', amount: 1924130.00, currency: 'INR', status: 'pending', settledAt: null, transactions: 89 },
  { id: 'SET-003', merchantId: 'MER-003', merchant: 'Euro Imports', amount: 1041250.00, currency: 'INR', status: 'processing', settledAt: null, transactions: 45 },
  { id: 'SET-004', merchantId: 'MER-005', merchant: 'North Bay Exports', amount: 1558135.00, currency: 'INR', status: 'completed', settledAt: '2024-01-09', transactions: 67 },
  { id: 'SET-005', merchantId: 'MER-001', merchant: 'TechCorp Inc', amount: 4331600.00, currency: 'INR', status: 'completed', settledAt: '2024-01-08', transactions: 189 },
]

const StatusBadge = ({ status }) => {
  const styles = {
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  }
  const icons = { completed: Check, pending: Clock, processing: DollarSign }
  const Icon = icons[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${styles[status]}`}>
      <Icon className="w-3.5 h-3.5" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function Settlements() {
  const [settlements, setSettlements] = useState(mockSettlements)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedSettlement, setSelectedSettlement] = useState(null)
  const [showCreateSettlement, setShowCreateSettlement] = useState(false)

  const filteredSettlements = settlements.filter(s => {
    const matchesSearch = s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.merchant.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' || s.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const stats = {
    total: settlements.length,
    completed: settlements.filter(s => s.status === 'completed').length,
    pending: settlements.filter(s => s.status === 'pending').length,
    totalVolume: settlements.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.amount, 0)
  }

  const handleProcessSettlement = (id) => {
    setSettlements(settlements.map(s => {
      if (s.id === id && s.status === 'pending') {
        return { ...s, status: 'processing' }
      }
      return s
    }))
    // Simulate processing completion
    setTimeout(() => {
      setSettlements(prev => prev.map(s => {
        if (s.id === id && s.status === 'processing') {
          return { ...s, status: 'completed', settledAt: new Date().toISOString().split('T')[0] }
        }
        return s
      }))
    }, 2000)
  }

  const handleCreateSettlement = (e) => {
    e.preventDefault()
    const newSettlement = {
      id: `SET-${String(settlements.length + 1).padStart(3, '0')}`,
      merchantId: 'MER-001',
      merchant: 'New Merchant',
      amount: Math.floor(Math.random() * 50000) + 10000,
      currency: 'INR',
      status: 'pending',
      settledAt: null,
      transactions: Math.floor(Math.random() * 100) + 20
    }
    setSettlements([newSettlement, ...settlements])
    setShowCreateSettlement(false)
  }

  const handleExport = () => {
    const csv = ['ID,Merchant,Amount,Currency,Status,Settled At,Transactions']
    filteredSettlements.forEach(s => {
      csv.push(`${s.id},${s.merchant},${s.amount},${s.currency},${s.status},${s.settledAt || 'N/A'},${s.transactions}`)
    })
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'settlements.csv'
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settlements</h1>
          <p className="text-gray-400">Manage merchant payouts and settlements</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all">
            <Download className="w-4 h-4" />
            Export
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateSettlement(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl font-medium hover:shadow-lg hover:shadow-primary-500/25 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Settlement
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-gray-400 text-sm">Total Settlements</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-gray-400 text-sm">Completed</p>
          <p className="text-2xl font-bold mt-1 text-green-400">{stats.completed}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-gray-400 text-sm">Pending</p>
          <p className="text-2xl font-bold mt-1 text-yellow-400">{stats.pending}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-gray-400 text-sm">Total Volume</p>
          <p className="text-2xl font-bold mt-1">${stats.totalVolume.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-64 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search settlements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'completed', 'pending', 'processing'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl transition-all ${
                filterStatus === status
                  ? 'bg-primary-500/30 text-primary-300 border border-primary-500/50'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Settlements Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-gray-400 font-medium">Settlement ID</th>
                <th className="text-left p-4 text-gray-400 font-medium">Merchant</th>
                <th className="text-left p-4 text-gray-400 font-medium">Amount</th>
                <th className="text-left p-4 text-gray-400 font-medium">Transactions</th>
                <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                <th className="text-left p-4 text-gray-400 font-medium">Settled At</th>
                <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSettlements.map((settlement, idx) => (
                <motion.tr
                  key={settlement.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="p-4"><span className="font-mono text-primary-300">{settlement.id}</span></td>
                  <td className="p-4">{settlement.merchant}</td>
                  <td className="p-4"><span className="font-semibold">{settlement.currency} {settlement.amount.toLocaleString()}</span></td>
                  <td className="p-4">{settlement.transactions}</td>
                  <td className="p-4"><StatusBadge status={settlement.status} /></td>
                  <td className="p-4 text-gray-400">{settlement.settledAt || '-'}</td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setSelectedSettlement(settlement)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      {settlement.status === 'pending' && (
                        <button onClick={() => handleProcessSettlement(settlement.id)} className="p-2 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors">
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Settlement Modal */}
      <AnimatePresence>
        {selectedSettlement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedSettlement(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Settlement Details</h2>
                <button onClick={() => setSelectedSettlement(null)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-white/10"><span className="text-gray-400">ID</span><span className="font-mono text-primary-300">{selectedSettlement.id}</span></div>
                <div className="flex justify-between py-2 border-b border-white/10"><span className="text-gray-400">Merchant</span><span>{selectedSettlement.merchant}</span></div>
                <div className="flex justify-between py-2 border-b border-white/10"><span className="text-gray-400">Amount</span><span className="font-semibold">{selectedSettlement.currency} {selectedSettlement.amount.toLocaleString()}</span></div>
                <div className="flex justify-between py-2 border-b border-white/10"><span className="text-gray-400">Transactions</span><span>{selectedSettlement.transactions}</span></div>
                <div className="flex justify-between py-2 border-b border-white/10"><span className="text-gray-400">Status</span><StatusBadge status={selectedSettlement.status} /></div>
                <div className="flex justify-between py-2"><span className="text-gray-400">Settled At</span><span>{selectedSettlement.settledAt || 'Not settled'}</span></div>
              </div>
              <button onClick={() => setSelectedSettlement(null)} className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl">Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Settlement Modal */}
      <AnimatePresence>
        {showCreateSettlement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateSettlement(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Create Settlement</h2>
                <button onClick={() => setShowCreateSettlement(false)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-gray-400 mb-6">This will create a new settlement batch for pending transactions.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowCreateSettlement(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl">Cancel</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCreateSettlement} className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl font-medium">Create</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

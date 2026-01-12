import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Clock, Check, Building2 } from 'lucide-react'
import { useAuth } from '../App'
import { transfersStore, currencySymbols } from '../stores/transfersStore'

export default function MerchantDashboard() {
  const { user } = useAuth()
  const [transfers, setTransfers] = useState([])
  const [requests, setRequests] = useState([])
  const [stats, setStats] = useState({ totalSent: 0, totalReceived: 0, totalPending: 0, netBalance: 0, sentCount: 0, receivedCount: 0, pendingCount: 0 })

  useEffect(() => {
    const updateData = () => {
      if (user?.merchantId) {
        setTransfers(transfersStore.getTransfersForMerchant(user.merchantId))
        setRequests(transfersStore.getIncomingRequests(user.merchantId))
        setStats(transfersStore.getMerchantStats(user.merchantId))
      }
    }
    
    updateData()
    const unsubscribe = transfersStore.subscribe(updateData)
    return () => unsubscribe()
  }, [user?.merchantId])

  const recentTransfers = transfers.slice(0, 10)

  const handleApproveRequest = (id) => {
    transfersStore.approveRequest(id)
  }

  const handleDeclineRequest = (id) => {
    if (confirm('Are you sure you want to decline this request?')) {
      transfersStore.declineRequest(id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-400">Welcome back, {user?.merchantName || user?.firstName}</p>
      </div>

      {/* Merchant Info */}
      <div className="glass-card p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <Building2 className="w-7 h-7 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{user?.merchantName}</h2>
          <p className="text-gray-400 font-mono">{user?.merchantId}</p>
        </div>
      </div>

      {/* Current Balance Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-6 bg-gradient-to-r from-accent-500/20 to-primary-500/20 border border-accent-500/30"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Current Balance</p>
            <p className="text-4xl font-bold text-accent-400 mt-1">₹{(stats.currentBalance || 0).toLocaleString('en-IN')}</p>
            <p className="text-sm text-gray-500 mt-1">
              Starting: ₹{(stats.initialBalance || 1000000).toLocaleString('en-IN')} 
              <span className={stats.netBalance >= 0 ? 'text-green-400 ml-2' : 'text-red-400 ml-2'}>
                ({stats.netBalance >= 0 ? '+' : ''}₹{(stats.netBalance || 0).toLocaleString('en-IN')})
              </span>
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-accent-500/20 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-accent-400" />
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Total Received</span>
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5 text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-400">₹{stats.totalReceived.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.receivedCount} transactions</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Total Sent</span>
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-400">₹{stats.totalSent.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.sentCount} transactions</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Net Balance</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stats.netBalance >= 0 ? 'bg-accent-500/20' : 'bg-orange-500/20'}`}>
              {stats.netBalance >= 0 ? <TrendingUp className="w-5 h-5 text-accent-400" /> : <TrendingDown className="w-5 h-5 text-orange-400" />}
            </div>
          </div>
          <p className={`text-2xl font-bold ${stats.netBalance >= 0 ? 'text-accent-400' : 'text-orange-400'}`}>
            {stats.netBalance >= 0 ? '+' : ''}₹{stats.netBalance.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-gray-500 mt-1">Received - Sent</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Pending</span>
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-yellow-400">₹{stats.totalPending.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.pendingCount} pending</p>
        </motion.div>
      </div>

      {/* Incoming Requests */}
      {requests.length > 0 && (
        <div className="glass-card overflow-hidden border-l-4 border-l-white">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-accent-500/10">
            <div>
              <h2 className="text-lg font-bold text-accent-400">Incoming Money Requests</h2>
              <p className="text-sm text-gray-400">Other merchants are requesting payments from you</p>
            </div>
            <span className="px-3 py-1 bg-accent-500 text-white text-xs font-bold rounded-full">{requests.length} New</span>
          </div>
          <div className="divide-y divide-white/10">
            {requests.map((req) => (
              <div key={req.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{req.toName}</p>
                    <p className="text-sm text-gray-400 font-mono">Requesting: {currencySymbols[req.currency]}{req.amount.toLocaleString('en-IN')}</p>
                    {req.note && <p className="text-sm text-gray-500 mt-1 italic">"{req.note}"</p>}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDeclineRequest(req.id)}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium transition-colors"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleApproveRequest(req.id)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-green-500/20 transition-all flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Approve & Pay
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <p className="text-sm text-gray-400">All incoming and outgoing transfers</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-gray-400 font-medium">Type</th>
                <th className="text-left p-4 text-gray-400 font-medium">Transfer ID</th>
                <th className="text-left p-4 text-gray-400 font-medium">From/To</th>
                <th className="text-left p-4 text-gray-400 font-medium">Amount</th>
                <th className="text-left p-4 text-gray-400 font-medium">Note</th>
                <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                <th className="text-left p-4 text-gray-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentTransfers.map((transfer, idx) => {
                const isReceived = transfer.toMerchant === user?.merchantId
                return (
                  <motion.tr
                    key={transfer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${
                        isReceived 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}>
                        {isReceived ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        {isReceived ? 'Received' : 'Sent'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-primary-300">{transfer.id}</span>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-semibold">{isReceived ? transfer.fromName : transfer.toName}</p>
                        <p className="text-sm text-gray-400 font-mono">{isReceived ? transfer.fromMerchant : transfer.toMerchant}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`font-semibold ${isReceived ? 'text-green-400' : 'text-red-400'}`}>
                        {isReceived ? '+' : '-'}{currencySymbols[transfer.currency] || ''}{(isReceived ? transfer.amount - (transfer.fee || 0) : transfer.amount).toLocaleString('en-IN')} 
                        <span className="text-xs text-gray-400 ml-1">{transfer.currency}</span>
                      </span>
                      {isReceived && transfer.fee > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          (fee: {currencySymbols[transfer.currency]}{transfer.fee})
                        </div>
                      )}
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
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

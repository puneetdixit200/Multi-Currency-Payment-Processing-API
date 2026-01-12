import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, Clock, AlertCircle, RefreshCw } from 'lucide-react'

const mockTransactions = [
  { id: 'TXN-001', from: 'INR', to: 'USD', amount: 416500, status: 'completed', time: '2 min ago' },
  { id: 'TXN-002', from: 'INR', to: 'EUR', amount: 266650, status: 'processing', time: '5 min ago' },
  { id: 'TXN-003', from: 'INR', to: 'GBP', amount: 124875, status: 'completed', time: '10 min ago' },
  { id: 'TXN-004', from: 'INR', to: 'JPY', amount: 666400, status: 'pending', time: '15 min ago' },
  { id: 'TXN-005', from: 'INR', to: 'CAD', amount: 174930, status: 'completed', time: '20 min ago' },
]

const StatusIcon = ({ status }) => {
  switch (status) {
    case 'completed':
      return <Check className="w-4 h-4 text-green-400" />
    case 'processing':
      return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-400" />
    default:
      return <AlertCircle className="w-4 h-4 text-red-400" />
  }
}

export default function TransactionFlow() {
  const [transactions, setTransactions] = useState(mockTransactions)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (isPaused) return
    
    const interval = setInterval(() => {
      // Simulate processing transactions
      setTransactions(prev => prev.map(txn => {
        if (txn.status === 'processing') {
          return { ...txn, status: 'completed' }
        }
        if (txn.status === 'pending' && Math.random() > 0.7) {
          return { ...txn, status: 'processing' }
        }
        return txn
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [isPaused])

  const handleRetry = (id) => {
    setTransactions(prev => prev.map(txn => 
      txn.id === id ? { ...txn, status: 'processing' } : txn
    ))
  }

  const handleTogglePause = () => {
    setIsPaused(!isPaused)
  }

  const statusColors = {
    completed: 'border-green-500/30 bg-green-500/10',
    processing: 'border-blue-500/30 bg-blue-500/10',
    pending: 'border-yellow-500/30 bg-yellow-500/10',
    failed: 'border-red-500/30 bg-red-500/10'
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Live Transaction Flow</h2>
          <p className="text-sm text-gray-400">Real-time currency conversions</p>
        </div>
        <button
          onClick={handleTogglePause}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            isPaused 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          }`}
        >
          {isPaused ? 'Resume' : 'Pause'} Updates
        </button>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {transactions.map((txn, idx) => (
            <motion.div
              key={txn.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: idx * 0.1 }}
              className={`flex items-center justify-between p-4 rounded-xl border ${statusColors[txn.status]} transition-all hover:scale-[1.01]`}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <StatusIcon status={txn.status} />
                  <span className="font-mono text-sm text-gray-400">{txn.id}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold">{txn.from}</span>
                  <ArrowRight className="w-4 h-4 text-gray-500" />
                  <span className="font-bold">{txn.to}</span>
                </div>
                <span className="text-lg font-semibold">₹{txn.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">{txn.time}</span>
                {txn.status === 'pending' && (
                  <button
                    onClick={() => handleRetry(txn.id)}
                    className="px-3 py-1 bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 rounded-lg text-sm transition-colors"
                  >
                    Process
                  </button>
                )}
                {txn.status === 'failed' && (
                  <button
                    onClick={() => handleRetry(txn.id)}
                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition-colors"
                  >
                    Retry
                  </button>
                )}
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  txn.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  txn.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                  txn.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

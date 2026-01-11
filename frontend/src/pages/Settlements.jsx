import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Clock, AlertCircle, DollarSign } from 'lucide-react'
import { useAuth } from '../App'

export default function Settlements() {
  const { token } = useAuth()
  const [settlements, setSettlements] = useState([])

  useEffect(() => {
    fetchSettlements()
  }, [])

  const fetchSettlements = async () => {
    try {
      const res = await fetch('/api/v1/settlements', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setSettlements(data.settlements || [])
    } catch {
      setSettlements([
        { _id: '1', settlementId: 'STL-20240110-ABC', merchantId: { businessName: 'TechFlow Inc' }, netAmount: 45000, currency: 'USD', status: 'completed', transactionCount: 156, createdAt: new Date().toISOString() },
        { _id: '2', settlementId: 'STL-20240110-DEF', merchantId: { businessName: 'Global Retail' }, netAmount: 28500, currency: 'EUR', status: 'processing', transactionCount: 89, createdAt: new Date().toISOString() },
        { _id: '3', settlementId: 'STL-20240109-GHI', merchantId: { businessName: 'StartupXYZ' }, netAmount: 12000, currency: 'USD', status: 'pending', transactionCount: 45, createdAt: new Date(Date.now() - 86400000).toISOString() },
        { _id: '4', settlementId: 'STL-20240108-JKL', merchantId: { businessName: 'Premium Svcs' }, netAmount: 85000, currency: 'GBP', status: 'completed', transactionCount: 234, createdAt: new Date(Date.now() - 172800000).toISOString() },
      ])
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'processing': return <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />
      case 'pending': return <Clock className="w-5 h-5 text-blue-400" />
      default: return <AlertCircle className="w-5 h-5 text-red-400" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settlements</h1>
        <p className="text-gray-400">Track settlement batches and reconciliation</p>
      </div>

      {/* Timeline */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold mb-6">Settlement Timeline</h2>
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary-500 via-accent-500 to-transparent" />
          
          {settlements.map((settlement, idx) => (
            <motion.div
              key={settlement._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative flex gap-6 pb-8 last:pb-0"
            >
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-dark-800 border border-white/10 flex items-center justify-center">
                {getStatusIcon(settlement.status)}
              </div>
              
              <div className="flex-1 glass-card p-5 hover:border-primary-500/30 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{settlement.settlementId}</h3>
                    <p className="text-gray-400 text-sm">{settlement.merchantId?.businessName || 'Unknown Merchant'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    settlement.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    settlement.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {settlement.status}
                  </span>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-accent-400" />
                    <span className="font-mono font-semibold">{settlement.netAmount.toLocaleString()} {settlement.currency}</span>
                  </div>
                  <div className="text-gray-400 text-sm">
                    {settlement.transactionCount} transactions
                  </div>
                  <div className="text-gray-400 text-sm ml-auto">
                    {new Date(settlement.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

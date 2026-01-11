import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Building2, CheckCircle, Clock, XCircle } from 'lucide-react'
import { useAuth } from '../App'

const tierColors = {
  starter: 'from-gray-500 to-gray-600',
  growth: 'from-blue-500 to-blue-600',
  enterprise: 'from-purple-500 to-purple-600',
  vip: 'from-amber-500 to-amber-600'
}

const statusIcons = {
  active: CheckCircle,
  pending: Clock,
  suspended: XCircle
}

export default function Merchants() {
  const { token } = useAuth()
  const [merchants, setMerchants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMerchants()
  }, [])

  const fetchMerchants = async () => {
    try {
      const res = await fetch('/api/v1/merchants', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setMerchants(data.merchants || [])
    } catch {
      setMerchants([
        { _id: '1', businessName: 'TechFlow Inc', tier: 'enterprise', status: 'active', contactEmail: 'contact@techflow.com', totalVolume: 1250000 },
        { _id: '2', businessName: 'Global Retail Co', tier: 'growth', status: 'active', contactEmail: 'info@globalretail.com', totalVolume: 450000 },
        { _id: '3', businessName: 'StartupXYZ', tier: 'starter', status: 'pending', contactEmail: 'hello@startupxyz.io', totalVolume: 25000 },
        { _id: '4', businessName: 'Premium Services', tier: 'vip', status: 'active', contactEmail: 'support@premium.biz', totalVolume: 3500000 },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Merchants</h1>
          <p className="text-gray-400">Manage merchant accounts and onboarding</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Merchant
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {merchants.map((merchant, idx) => {
          const StatusIcon = statusIcons[merchant.status] || Clock
          return (
            <motion.div
              key={merchant._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-6 hover:border-primary-500/30 transition-all cursor-pointer glass-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${tierColors[merchant.tier]}`}>
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                  merchant.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  merchant.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  <StatusIcon className="w-3 h-3" />
                  {merchant.status}
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-1">{merchant.businessName}</h3>
              <p className="text-gray-400 text-sm mb-4">{merchant.contactEmail}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div>
                  <p className="text-xs text-gray-400">Tier</p>
                  <p className="font-medium capitalize">{merchant.tier}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Volume</p>
                  <p className="font-medium">${(merchant.totalVolume / 1000).toFixed(0)}K</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

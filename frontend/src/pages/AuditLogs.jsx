import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, AlertCircle, Info, AlertTriangle, Shield } from 'lucide-react'
import { useAuth } from '../App'

const severityConfig = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
  critical: { icon: Shield, color: 'text-red-500', bg: 'bg-red-600/20' }
}

export default function AuditLogs() {
  const { token } = useAuth()
  const [logs, setLogs] = useState([])
  const [filters, setFilters] = useState({ category: '', severity: '', search: '' })

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/v1/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setLogs(data.logs || [])
    } catch {
      setLogs([
        { _id: '1', action: 'payment_created', category: 'payment', severity: 'info', actor: { email: 'admin@example.com' }, timestamp: new Date().toISOString() },
        { _id: '2', action: 'user_login', category: 'auth', severity: 'info', actor: { email: 'merchant@example.com' }, timestamp: new Date(Date.now() - 3600000).toISOString() },
        { _id: '3', action: 'login_failed', category: 'auth', severity: 'warning', actor: { email: 'unknown@test.com' }, timestamp: new Date(Date.now() - 7200000).toISOString() },
        { _id: '4', action: 'settlement_created', category: 'settlement', severity: 'info', actor: { email: 'manager@example.com' }, timestamp: new Date(Date.now() - 10800000).toISOString() },
        { _id: '5', action: 'fraud_alert', category: 'payment', severity: 'critical', actor: { email: 'system' }, timestamp: new Date(Date.now() - 14400000).toISOString() },
      ])
    }
  }

  const filteredLogs = logs.filter(log => {
    if (filters.category && log.category !== filters.category) return false
    if (filters.severity && log.severity !== filters.severity) return false
    if (filters.search && !log.action.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-gray-400">Compliance-grade activity tracking</p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search actions..."
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 focus:outline-none"
          />
        </div>
        <select
          value={filters.category}
          onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl"
        >
          <option value="">All Categories</option>
          <option value="auth">Auth</option>
          <option value="payment">Payment</option>
          <option value="merchant">Merchant</option>
          <option value="settlement">Settlement</option>
        </select>
        <select
          value={filters.severity}
          onChange={(e) => setFilters(f => ({ ...f, severity: e.target.value }))}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl"
        >
          <option value="">All Severity</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Log List */}
      <div className="glass-card divide-y divide-white/5">
        {filteredLogs.map((log, idx) => {
          const config = severityConfig[log.severity] || severityConfig.info
          const Icon = config.icon
          return (
            <motion.div
              key={log._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="p-4 hover:bg-white/5 transition-colors flex items-center gap-4"
            >
              <div className={`p-2 rounded-lg ${config.bg}`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{log.action}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-white/10">{log.category}</span>
                </div>
                <p className="text-gray-400 text-sm">{log.actor?.email}</p>
              </div>
              <div className="text-gray-400 text-sm">
                {new Date(log.timestamp).toLocaleString()}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

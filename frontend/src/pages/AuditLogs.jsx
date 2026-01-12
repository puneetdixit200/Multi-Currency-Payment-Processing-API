import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Search, Filter, Download, Calendar, User, Activity, AlertCircle, Check, Info } from 'lucide-react'

const mockLogs = [
  { id: 1, action: 'payment.created', user: 'admin@payflow.com', details: 'Payment PAY-001 created for $1,250.00', timestamp: '2024-01-10 14:32:15', level: 'info' },
  { id: 2, action: 'merchant.updated', user: 'admin@payflow.com', details: 'Merchant MER-002 status changed to active', timestamp: '2024-01-10 14:28:00', level: 'info' },
  { id: 3, action: 'settlement.processed', user: 'system', details: 'Settlement SET-001 completed for $45,250.00', timestamp: '2024-01-10 14:15:30', level: 'success' },
  { id: 4, action: 'auth.login', user: 'admin@payflow.com', details: 'User logged in successfully', timestamp: '2024-01-10 14:00:00', level: 'info' },
  { id: 5, action: 'payment.failed', user: 'system', details: 'Payment PAY-004 failed: Insufficient funds', timestamp: '2024-01-09 16:45:00', level: 'error' },
  { id: 6, action: 'fx.rate_update', user: 'system', details: 'Exchange rates updated for 10 currency pairs', timestamp: '2024-01-09 12:00:00', level: 'info' },
  { id: 7, action: 'merchant.created', user: 'admin@payflow.com', details: 'New merchant MER-005 registered', timestamp: '2024-01-08 10:30:00', level: 'success' },
  { id: 8, action: 'auth.logout', user: 'admin@payflow.com', details: 'User logged out', timestamp: '2024-01-08 18:00:00', level: 'info' },
]

const LevelBadge = ({ level }) => {
  const styles = {
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30'
  }
  const icons = { info: Info, success: Check, warning: AlertCircle, error: AlertCircle }
  const Icon = icons[level]
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${styles[level]}`}>
      <Icon className="w-3.5 h-3.5" />
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  )
}

export default function AuditLogs() {
  const [logs, setLogs] = useState(mockLogs)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLevel, setFilterLevel] = useState('all')
  const [filterAction, setFilterAction] = useState('all')

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.user.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel
    const matchesAction = filterAction === 'all' || log.action.startsWith(filterAction)
    return matchesSearch && matchesLevel && matchesAction
  })

  const actionTypes = ['all', 'payment', 'merchant', 'settlement', 'auth', 'fx']

  const handleExport = () => {
    const csv = ['ID,Action,User,Details,Timestamp,Level']
    filteredLogs.forEach(log => {
      csv.push(`${log.id},${log.action},"${log.user}","${log.details}",${log.timestamp},${log.level}`)
    })
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'audit_logs.csv'
    a.click()
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setFilterLevel('all')
    setFilterAction('all')
  }

  const handleRefresh = () => {
    // Simulate refresh by adding a new log entry
    const newLog = {
      id: logs.length + 1,
      action: 'system.refresh',
      user: 'admin@payflow.com',
      details: 'Audit logs refreshed',
      timestamp: new Date().toLocaleString('sv-SE').replace('T', ' '),
      level: 'info'
    }
    setLogs([newLog, ...logs])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-gray-400">Track all system activities and changes</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
          >
            <Activity className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
            />
          </div>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
          >
            Clear Filters
          </button>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Level:</span>
            <div className="flex gap-2">
              {['all', 'info', 'success', 'warning', 'error'].map(level => (
                <button
                  key={level}
                  onClick={() => setFilterLevel(level)}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    filterLevel === level
                      ? 'bg-primary-500/30 text-primary-300 border border-primary-500/50'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Action:</span>
            <div className="flex gap-2">
              {actionTypes.map(action => (
                <button
                  key={action}
                  onClick={() => setFilterAction(action)}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    filterAction === action
                      ? 'bg-primary-500/30 text-primary-300 border border-primary-500/50'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-gray-400 text-sm">Total Logs</p>
          <p className="text-2xl font-bold mt-1">{filteredLogs.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-gray-400 text-sm">Info</p>
          <p className="text-2xl font-bold mt-1 text-blue-400">{filteredLogs.filter(l => l.level === 'info').length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-gray-400 text-sm">Success</p>
          <p className="text-2xl font-bold mt-1 text-green-400">{filteredLogs.filter(l => l.level === 'success').length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-gray-400 text-sm">Errors</p>
          <p className="text-2xl font-bold mt-1 text-red-400">{filteredLogs.filter(l => l.level === 'error').length}</p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-gray-400 font-medium">Timestamp</th>
                <th className="text-left p-4 text-gray-400 font-medium">Action</th>
                <th className="text-left p-4 text-gray-400 font-medium">User</th>
                <th className="text-left p-4 text-gray-400 font-medium">Details</th>
                <th className="text-left p-4 text-gray-400 font-medium">Level</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="p-4 text-gray-400 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {log.timestamp}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-primary-300">{log.action}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      {log.user}
                    </div>
                  </td>
                  <td className="p-4 max-w-md truncate">{log.details}</td>
                  <td className="p-4"><LevelBadge level={log.level} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredLogs.length === 0 && (
        <div className="glass-card p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-500 mb-4" />
          <p className="text-gray-400">No logs match your filters</p>
          <button
            onClick={handleClearFilters}
            className="mt-4 px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 rounded-xl transition-all"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  )
}

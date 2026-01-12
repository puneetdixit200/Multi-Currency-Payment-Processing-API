import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, Search, Filter, Plus, X, Check, Clock, AlertCircle, ArrowUpRight, Download, Eye, Upload, FileSpreadsheet } from 'lucide-react'
import { mockMerchants } from './Merchants'

const currencies = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SGD']

const mockPayments = [
  { id: 'PAY-001', amount: 104375.00, currency: 'INR', targetCurrency: 'EUR', convertedAmount: 1148.13, status: 'completed', merchant: 'TechCorp Inc', date: '2024-01-10', fxRate: 0.011 },
  { id: 'PAY-002', amount: 291550.00, currency: 'INR', targetCurrency: 'USD', convertedAmount: 3498.60, status: 'pending', merchant: 'Global Trade Ltd', date: '2024-01-10', fxRate: 0.012 },
  { id: 'PAY-003', amount: 74200.00, currency: 'INR', targetCurrency: 'JPY', convertedAmount: 132076.00, status: 'completed', merchant: 'Euro Imports', date: '2024-01-09', fxRate: 1.78 },
  { id: 'PAY-004', amount: 175000.00, currency: 'INR', targetCurrency: 'GBP', convertedAmount: 1662.50, status: 'failed', merchant: 'Quick Pay Services', date: '2024-01-09', fxRate: 0.0095 },
  { id: 'PAY-005', amount: 416500.00, currency: 'INR', targetCurrency: 'CAD', convertedAmount: 6664.00, status: 'completed', merchant: 'North Bay Exports', date: '2024-01-08', fxRate: 0.016 },
]

const StatusBadge = ({ status }) => {
  const styles = {
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30'
  }
  const icons = {
    completed: Check,
    pending: Clock,
    failed: AlertCircle
  }
  const Icon = icons[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${styles[status]}`}>
      <Icon className="w-3.5 h-3.5" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function Payments() {
  const [payments, setPayments] = useState(mockPayments)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showNewPayment, setShowNewPayment] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importedPayments, setImportedPayments] = useState([])
  const [importError, setImportError] = useState('')
  const fileInputRef = useRef(null)
  const [newPayment, setNewPayment] = useState({
    amount: '',
    currency: 'INR',
    targetCurrency: 'USD',
    merchant: '',
    merchantId: ''
  })

  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.merchant.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' || p.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const handleCreatePayment = (e) => {
    e.preventDefault()
    const payment = {
      id: `PAY-${String(payments.length + 1).padStart(3, '0')}`,
      amount: parseFloat(newPayment.amount),
      currency: newPayment.currency,
      targetCurrency: newPayment.targetCurrency,
      status: 'pending',
      merchant: newPayment.merchant,
      merchantId: newPayment.merchantId || `MER-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      fxRate: (Math.random() * 0.5 + 0.8).toFixed(4)
    }
    setPayments([payment, ...payments])
    setShowNewPayment(false)
    setNewPayment({ amount: '', currency: 'INR', targetCurrency: 'USD', merchant: '', merchantId: '' })
  }

  const handleExport = () => {
    const csv = ['ID,Amount,Currency,Target Currency,Status,Merchant,Date,FX Rate']
    filteredPayments.forEach(p => {
      csv.push(`${p.id},${p.amount},${p.currency},${p.targetCurrency},${p.status},${p.merchant},${p.date},${p.fxRate}`)
    })
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'payments.csv'
    a.click()
  }

  const handleFileImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setImportError('')
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result
        const lines = text.split('\n').filter(line => line.trim())
        
        if (lines.length < 2) {
          setImportError('File must contain header and at least one data row')
          return
        }
        
        // Parse header
        const header = lines[0].split(',').map(h => h.trim().toLowerCase())
        
        // Parse data rows
        const parsed = []
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim())
          if (values.length < 5) continue
          
          const payment = {
            id: values[0] || `PAY-IMP-${String(i).padStart(3, '0')}`,
            amount: parseFloat(values[1]) || 0,
            currency: values[2]?.toUpperCase() || 'INR',
            targetCurrency: values[3]?.toUpperCase() || 'USD',
            merchant: values[4] || 'Unknown',
            fxRate: parseFloat(values[5]) || 0.012,
            status: 'pending',
            date: new Date().toISOString().split('T')[0],
            convertedAmount: null
          }
          payment.convertedAmount = (payment.amount * payment.fxRate).toFixed(2)
          parsed.push(payment)
        }
        
        if (parsed.length === 0) {
          setImportError('No valid payment rows found in file')
          return
        }
        
        setImportedPayments(parsed)
        setShowImportModal(true)
      } catch (err) {
        setImportError('Error parsing file: ' + err.message)
      }
    }
    
    reader.readAsText(file)
    e.target.value = '' // Reset input
  }

  const handleConfirmImport = () => {
    setPayments([...importedPayments, ...payments])
    setImportedPayments([])
    setShowImportModal(false)
  }

  const handleDownloadTemplate = () => {
    window.open('/sample_transactions.csv', '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-gray-400">Manage and track all payment transactions</p>
        </div>
        <div className="flex gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".csv,.txt"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowNewPayment(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl font-medium hover:shadow-lg hover:shadow-primary-500/25 transition-all"
          >
            <Plus className="w-5 h-5" />
            New Payment
          </motion.button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-64 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'completed', 'pending', 'failed'].map(status => (
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

      {/* Payments Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-gray-400 font-medium">Transaction ID</th>
                <th className="text-left p-4 text-gray-400 font-medium">Amount (INR)</th>
                <th className="text-left p-4 text-gray-400 font-medium">Conversion</th>
                <th className="text-left p-4 text-gray-400 font-medium">Merchant Receives</th>
                <th className="text-left p-4 text-gray-400 font-medium">Merchant</th>
                <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                <th className="text-left p-4 text-gray-400 font-medium">Date</th>
                <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment, idx) => (
                <motion.tr
                  key={payment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="p-4">
                    <span className="font-mono text-primary-300">{payment.id}</span>
                  </td>
                  <td className="p-4">
                    <span className="font-semibold">₹{payment.amount.toLocaleString('en-IN')}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span>{payment.currency}</span>
                      <ArrowUpRight className="w-4 h-4 text-gray-500" />
                      <span>{payment.targetCurrency}</span>
                      <span className="text-xs text-gray-500">@{payment.fxRate}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-semibold text-accent-400">{payment.targetCurrency} {payment.convertedAmount?.toLocaleString() || (payment.amount * payment.fxRate).toFixed(2)}</span>
                  </td>
                  <td className="p-4">{payment.merchant}</td>
                  <td className="p-4"><StatusBadge status={payment.status} /></td>
                  <td className="p-4 text-gray-400">{payment.date}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedPayment(payment)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Payment Modal */}
      <AnimatePresence>
        {showNewPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowNewPayment(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">New Payment</h2>
                <button
                  onClick={() => setShowNewPayment(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreatePayment} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Select Merchant</label>
                  <select
                    value={newPayment.merchantId}
                    onChange={(e) => {
                      const selected = mockMerchants.find(m => m.id === e.target.value)
                      setNewPayment(p => ({
                        ...p,
                        merchantId: e.target.value,
                        merchant: selected?.name || ''
                      }))
                    }}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                    required
                  >
                    <option value="">-- Select a Merchant --</option>
                    {mockMerchants.map(m => (
                      <option key={m.id} value={m.id}>{m.id} - {m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Amount (INR)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment(p => ({ ...p, amount: e.target.value }))}
                      className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                      placeholder="Enter amount in INR"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Merchant Payment Currency</label>
                  <select
                    value={newPayment.targetCurrency}
                    onChange={(e) => setNewPayment(p => ({ ...p, targetCurrency: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                  >
                    {currencies.filter(c => c !== 'INR').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Currency the merchant will receive</p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewPayment(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl font-medium"
                  >
                    Create Payment
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Detail Modal */}
      <AnimatePresence>
        {selectedPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPayment(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Payment Details</h2>
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-gray-400">Transaction ID</span>
                  <span className="font-mono text-primary-300">{selectedPayment.id}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-gray-400">Amount</span>
                  <span className="font-semibold">{selectedPayment.currency} {selectedPayment.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-gray-400">Conversion</span>
                  <span>{selectedPayment.currency} → {selectedPayment.targetCurrency}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-gray-400">FX Rate</span>
                  <span>{selectedPayment.fxRate}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-gray-400">Merchant</span>
                  <span>{selectedPayment.merchant}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-gray-400">Status</span>
                  <StatusBadge status={selectedPayment.status} />
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Date</span>
                  <span>{selectedPayment.date}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Preview Modal */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowImportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">Import Preview</h2>
                  <p className="text-sm text-gray-400">{importedPayments.length} transactions ready to import</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Download Template
                  </button>
                  <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-white/10 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {importError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {importError}
                </div>
              )}
              
              <div className="flex-1 overflow-auto mb-6">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900">
                    <tr className="border-b border-white/10">
                      <th className="text-left p-3 text-gray-400">ID</th>
                      <th className="text-left p-3 text-gray-400">Amount (INR)</th>
                      <th className="text-left p-3 text-gray-400">Target</th>
                      <th className="text-left p-3 text-gray-400">Merchant Receives</th>
                      <th className="text-left p-3 text-gray-400">Merchant</th>
                      <th className="text-left p-3 text-gray-400">FX Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedPayments.map((p, idx) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-3 font-mono text-primary-300">{p.id}</td>
                        <td className="p-3 font-semibold">₹{p.amount.toLocaleString('en-IN')}</td>
                        <td className="p-3">{p.targetCurrency}</td>
                        <td className="p-3 text-accent-400">{p.targetCurrency} {p.convertedAmount}</td>
                        <td className="p-3">{p.merchant}</td>
                        <td className="p-3 text-gray-400">{p.fxRate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowImportModal(false); setImportedPayments([]) }}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirmImport}
                  className="flex-1 py-3 bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Import {importedPayments.length} Transactions
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

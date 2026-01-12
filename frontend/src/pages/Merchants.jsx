import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Search, Plus, X, Edit2, Eye, Trash2 } from 'lucide-react'

const mockMerchants = [
  { id: 'MER-001', name: 'TechCorp Inc', email: 'techcorp@payflow.com', volume: 10412500, currency: 'INR', createdAt: '2023-06-15' },
  { id: 'MER-002', name: 'Global Trade Ltd', email: 'globaltrade@payflow.com', volume: 7412000, currency: 'INR', createdAt: '2023-08-20' },
  { id: 'MER-003', name: 'Euro Imports', email: 'euroimports@payflow.com', volume: 3750000, currency: 'INR', createdAt: '2023-10-01' },
  { id: 'MER-004', name: 'Quick Pay Services', email: 'admin@quickpay.com', volume: 0, currency: 'INR', createdAt: '2023-11-15' },
  { id: 'MER-005', name: 'North Bay Exports', email: 'accounts@northbay.ca', volume: 5625000, currency: 'INR', createdAt: '2023-12-01' },
]

// Export merchants for use in other components
export { mockMerchants }

export default function Merchants() {
  const [merchants, setMerchants] = useState(mockMerchants)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddMerchant, setShowAddMerchant] = useState(false)
  const [selectedMerchant, setSelectedMerchant] = useState(null)
  const [editMerchant, setEditMerchant] = useState(null)
  const [newMerchant, setNewMerchant] = useState({
    name: '',
    email: '',
    currency: 'INR'
  })

  const filteredMerchants = merchants.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddMerchant = (e) => {
    e.preventDefault()
    const merchant = {
      id: `MER-${String(merchants.length + 1).padStart(3, '0')}`,
      name: newMerchant.name,
      email: newMerchant.email,
      status: 'pending',
      volume: 0,
      currency: newMerchant.currency,
      createdAt: new Date().toISOString().split('T')[0]
    }
    setMerchants([merchant, ...merchants])
    setShowAddMerchant(false)
    setNewMerchant({ name: '', email: '', currency: 'INR' })
  }

  const handleUpdateMerchant = (e) => {
    e.preventDefault()
    setMerchants(merchants.map(m => m.id === editMerchant.id ? editMerchant : m))
    setEditMerchant(null)
  }

  const handleDeleteMerchant = (id) => {
    if (confirm('Are you sure you want to delete this merchant?')) {
      setMerchants(merchants.filter(m => m.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Merchants</h1>
          <p className="text-gray-400">Manage your merchant accounts</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddMerchant(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl font-medium hover:shadow-lg hover:shadow-primary-500/25 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Merchant
        </motion.button>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search merchants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Merchants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMerchants.map((merchant, idx) => (
          <motion.div
            key={merchant.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="glass-card p-6 hover:border-primary-500/30 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <h3 className="font-semibold">{merchant.name}</h3>
                  <p className="text-sm text-gray-400 font-mono">{merchant.id}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Email</span>
                <span className="truncate ml-2">{merchant.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Volume</span>
                <span>{merchant.currency} {merchant.volume.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Joined</span>
                <span>{merchant.createdAt}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
              <button
                onClick={() => setSelectedMerchant(merchant)}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                View
              </button>
              <button
                onClick={() => setEditMerchant(merchant)}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => handleDeleteMerchant(merchant.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Merchant Modal */}
      <AnimatePresence>
        {showAddMerchant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddMerchant(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Add Merchant</h2>
                <button onClick={() => setShowAddMerchant(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddMerchant} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={newMerchant.name}
                    onChange={(e) => setNewMerchant(m => ({ ...m, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Email</label>
                  <input
                    type="email"
                    value={newMerchant.email}
                    onChange={(e) => setNewMerchant(m => ({ ...m, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Default Currency</label>
                  <select
                    value={newMerchant.currency}
                    onChange={(e) => setNewMerchant(m => ({ ...m, currency: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 focus:outline-none"
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddMerchant(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl">
                    Cancel
                  </button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl font-medium">
                    Add Merchant
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Merchant Modal */}
      <AnimatePresence>
        {editMerchant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setEditMerchant(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Edit Merchant</h2>
                <button onClick={() => setEditMerchant(null)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleUpdateMerchant} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Company Name</label>
                  <input type="text" value={editMerchant.name} onChange={(e) => setEditMerchant(m => ({ ...m, name: e.target.value }))} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Email</label>
                  <input type="email" value={editMerchant.email} onChange={(e) => setEditMerchant(m => ({ ...m, email: e.target.value }))} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 focus:outline-none" required />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditMerchant(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl">Cancel</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl font-medium">Save Changes</motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Merchant Modal */}
      <AnimatePresence>
        {selectedMerchant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedMerchant(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Merchant Details</h2>
                <button onClick={() => setSelectedMerchant(null)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-white/10"><span className="text-gray-400">ID</span><span className="font-mono text-primary-300">{selectedMerchant.id}</span></div>
                <div className="flex justify-between py-2 border-b border-white/10"><span className="text-gray-400">Name</span><span>{selectedMerchant.name}</span></div>
                <div className="flex justify-between py-2 border-b border-white/10"><span className="text-gray-400">Email</span><span>{selectedMerchant.email}</span></div>
                <div className="flex justify-between py-2 border-b border-white/10"><span className="text-gray-400">Volume</span><span>₹{selectedMerchant.volume.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between py-2"><span className="text-gray-400">Created</span><span>{selectedMerchant.createdAt}</span></div>
              </div>
              <button onClick={() => setSelectedMerchant(null)} className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl">Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

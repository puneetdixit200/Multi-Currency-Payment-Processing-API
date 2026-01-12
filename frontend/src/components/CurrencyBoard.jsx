import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'

const currencies = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'SGD', name: 'Singapore Dollar' },
]

export default function CurrencyBoard() {
  const [rates, setRates] = useState({})
  const [previousRates, setPreviousRates] = useState({})
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const generateRates = () => {
    const newRates = {}
    currencies.forEach(curr => {
      const baseRate = {
        'USD': 0.0120, 'EUR': 0.0111, 'GBP': 0.0095, 'AUD': 0.0184,
        'CAD': 0.0163, 'CHF': 0.0106, 'CNY': 0.0871, 'HKD': 0.0940,
        'JPY': 1.7860, 'SGD': 0.0161
      }[curr.code] || 1
      // Add small random variation
      newRates[curr.code] = (baseRate + (Math.random() - 0.5) * 0.02).toFixed(4)
    })
    return newRates
  }

  useEffect(() => {
    setRates(generateRates())
  }, [])

  const handleRefresh = () => {
    setLoading(true)
    setPreviousRates(rates)
    setTimeout(() => {
      setRates(generateRates())
      setLastUpdated(new Date())
      setLoading(false)
    }, 500)
  }

  const getChangeIndicator = (code) => {
    if (!previousRates[code]) return null
    const current = parseFloat(rates[code])
    const previous = parseFloat(previousRates[code])
    if (current > previous) return <TrendingUp className="w-3 h-3 text-green-400" />
    if (current < previous) return <TrendingDown className="w-3 h-3 text-red-400" />
    return null
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Live Exchange Rates</h2>
          <p className="text-sm text-gray-400">Base: INR</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {currencies.map((currency, idx) => (
          <motion.div
            key={currency.code}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold">{currency.code}</span>
              <div className="flex items-center gap-1">
                {getChangeIndicator(currency.code)}
                <span className="text-xs text-gray-500">vs INR</span>
              </div>
            </div>
            <p className="text-xl font-mono">
              {rates[currency.code] || '-'}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

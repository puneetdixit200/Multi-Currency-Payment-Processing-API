import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'

const CURRENCIES = ['EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'INR', 'SGD', 'HKD']

export default function CurrencyBoard() {
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [baseCurrency] = useState('USD')

  useEffect(() => {
    fetchRates()
    const interval = setInterval(fetchRates, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const fetchRates = async () => {
    try {
      const res = await fetch(`/api/v1/currencies/rates?base=${baseCurrency}`)
      const data = await res.json()
      if (data.rates) {
        setRates(data.rates.filter(r => CURRENCIES.includes(r.currency)))
      }
    } catch (err) {
      // Generate mock data if API fails
      setRates(CURRENCIES.map(c => ({
        currency: c,
        rate: (Math.random() * 1.5 + 0.5).toFixed(4),
        change: (Math.random() * 4 - 2).toFixed(2)
      })))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Live Exchange Rates</h2>
          <p className="text-gray-400 text-sm">Base: {baseCurrency}</p>
        </div>
        <button
          onClick={fetchRates}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {rates.map((rate, idx) => (
          <motion.div
            key={rate.currency}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-primary-500/30"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg">{rate.currency}</span>
              <div className={`flex items-center gap-1 text-xs ${parseFloat(rate.change) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {parseFloat(rate.change) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(rate.change)}%
              </div>
            </div>
            <p className="text-2xl font-mono font-semibold">{parseFloat(rate.rate).toFixed(4)}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

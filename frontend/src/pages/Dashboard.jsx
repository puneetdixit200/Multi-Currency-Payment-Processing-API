import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, DollarSign, CreditCard, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import CurrencyBoard from '../components/CurrencyBoard'
import TransactionFlow from '../components/TransactionFlow'

const COLORS = ['#6366f1', '#34d399', '#fbbf24', '#f87171', '#a78bfa']

const StatCard = ({ title, value, change, icon: Icon, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-card p-6 hover:border-primary-500/30 transition-all duration-300 glass-hover"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-400 text-sm mb-1">{title}</p>
        <h3 className="text-3xl font-bold">{value}</h3>
        <div className={`flex items-center gap-1 mt-2 text-sm ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          <span>{Math.abs(change)}% vs last month</span>
        </div>
      </div>
      <div className={`p-3 rounded-xl bg-gradient-to-br ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </motion.div>
)

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalPayments: 0,
    volume: 0,
    merchants: 0,
    successRate: 0
  })
  const [chartData, setChartData] = useState([])
  const [pieData, setPieData] = useState([])

  useEffect(() => {
    // Mock data for demo
    setStats({
      totalPayments: 12847,
      volume: 2450000,
      merchants: 156,
      successRate: 98.7
    })
    
    const days = 14
    const data = Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      volume: Math.floor(Math.random() * 200000 + 150000),
      transactions: Math.floor(Math.random() * 1000 + 500)
    }))
    setChartData(data)

    setPieData([
      { name: 'USD', value: 45 },
      { name: 'EUR', value: 25 },
      { name: 'GBP', value: 15 },
      { name: 'JPY', value: 10 },
      { name: 'Other', value: 5 }
    ])
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400">Welcome back! Here's your payment overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="status-dot status-active"></div>
          <span className="text-sm text-gray-400">All systems operational</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Transactions"
          value={stats.totalPayments.toLocaleString()}
          change={12.5}
          icon={CreditCard}
          color="from-primary-500 to-primary-700"
        />
        <StatCard
          title="Total Volume"
          value={`$${(stats.volume / 1000000).toFixed(2)}M`}
          change={8.3}
          icon={DollarSign}
          color="from-accent-500 to-accent-700"
        />
        <StatCard
          title="Active Merchants"
          value={stats.merchants}
          change={5.2}
          icon={Users}
          color="from-purple-500 to-purple-700"
        />
        <StatCard
          title="Success Rate"
          value={`${stats.successRate}%`}
          change={0.8}
          icon={TrendingUp}
          color="from-amber-500 to-amber-700"
        />
      </div>

      {/* Currency Board */}
      <CurrencyBoard />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Volume Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-xl font-bold mb-4">Transaction Volume</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Area type="monotone" dataKey="volume" stroke="#6366f1" strokeWidth={2} fill="url(#volumeGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Currency Distribution */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-4">Currency Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 justify-center">
            {pieData.map((entry, idx) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                <span className="text-sm text-gray-400">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction Flow */}
      <TransactionFlow />
    </div>
  )
}

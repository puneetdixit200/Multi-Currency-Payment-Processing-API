import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Eye, EyeOff, ArrowRight, Shield, Building2 } from 'lucide-react'
import { useAuth } from '../App'

// Demo users - Admin and 3 Merchants
const DEMO_USERS = [
  { id: 'admin-001', email: 'admin@payflow.com', password: 'Admin123!', role: 'admin', firstName: 'Admin', lastName: 'User', merchantId: null },
  { id: 'mer-001', email: 'techcorp@payflow.com', password: 'Merchant1!', role: 'merchant', firstName: 'TechCorp', lastName: 'Inc', merchantId: 'MER-001', merchantName: 'TechCorp Inc' },
  { id: 'mer-002', email: 'globaltrade@payflow.com', password: 'Merchant2!', role: 'merchant', firstName: 'Global', lastName: 'Trade', merchantId: 'MER-002', merchantName: 'Global Trade Ltd' },
  { id: 'mer-003', email: 'euroimports@payflow.com', password: 'Merchant3!', role: 'merchant', firstName: 'Euro', lastName: 'Imports', merchantId: 'MER-003', merchantName: 'Euro Imports' },
  { id: 'mer-004', email: 'quickpay@payflow.com', password: 'Merchant4!', role: 'merchant', firstName: 'Quick', lastName: 'Pay', merchantId: 'MER-004', merchantName: 'Quick Pay Services' },
  { id: 'mer-005', email: 'northbay@payflow.com', password: 'Merchant5!', role: 'merchant', firstName: 'North', lastName: 'Bay', merchantId: 'MER-005', merchantName: 'North Bay Exports' },
]

export { DEMO_USERS }

export default function Login() {
  const { login } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Check demo users first
    const demoUser = DEMO_USERS.find(u => u.email === form.email && u.password === form.password)
    
    if (demoUser) {
      login({
        _id: demoUser.id,
        email: demoUser.email,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        role: demoUser.role,
        merchantId: demoUser.merchantId,
        merchantName: demoUser.merchantName
      }, 'demo-token')
      setLoading(false)
      return
    }

    try {
      const endpoint = isLogin ? '/api/v1/auth/login' : '/api/v1/auth/register'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      
      if (res.ok) {
        login(data.user, data.accessToken)
      } else {
        setError(data.error || 'Invalid email or password')
      }
    } catch {
      setError('Invalid email or password. Use demo credentials below.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold gradient-text">PayFlow</span>
        </div>

        <h2 className="text-2xl font-bold text-center mb-2">
          {isLogin ? 'Welcome back' : 'Create account'}
        </h2>
        <p className="text-gray-400 text-center mb-8">
          {isLogin ? 'Sign in to your account' : 'Get started with PayFlow'}
        </p>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 mb-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">First Name</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Last Name</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 focus:outline-none transition-colors pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl font-medium flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary-500/25 transition-all disabled:opacity-50"
          >
            {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </motion.button>
        </form>

        <p className="text-center mt-6 text-gray-400">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 text-primary-400 hover:text-primary-300 font-medium"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        {/* Demo Credentials Box */}
        <div className="mt-6 p-4 bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-500/30 rounded-xl">
          <p className="text-sm font-medium text-center mb-3 text-primary-300">🔐 Demo Login Credentials</p>
          
          {/* Admin */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">ADMIN</span>
            </div>
            <div className="bg-white/5 px-3 py-2 rounded-lg text-xs font-mono">
              <div className="flex justify-between"><span className="text-gray-400">Email:</span><span className="text-amber-300">admin@payflow.com</span></div>
              <div className="flex justify-between mt-1"><span className="text-gray-400">Pass:</span><span className="text-amber-300">Admin123!</span></div>
            </div>
          </div>
          
          {/* Merchants */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-accent-400" />
              <span className="text-xs font-semibold text-accent-400">MERCHANTS</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="bg-white/5 px-3 py-2 rounded-lg font-mono">
                <div className="text-gray-300 font-semibold mb-1">TechCorp Inc (MER-001)</div>
                <div className="flex justify-between"><span className="text-gray-400">Email:</span><span className="text-accent-300">techcorp@payflow.com</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Pass:</span><span className="text-accent-300">Merchant1!</span></div>
              </div>
              <div className="bg-white/5 px-3 py-2 rounded-lg font-mono">
                <div className="text-gray-300 font-semibold mb-1">Global Trade Ltd (MER-002)</div>
                <div className="flex justify-between"><span className="text-gray-400">Email:</span><span className="text-accent-300">globaltrade@payflow.com</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Pass:</span><span className="text-accent-300">Merchant2!</span></div>
              </div>
              <div className="bg-white/5 px-3 py-2 rounded-lg font-mono">
                <div className="text-gray-300 font-semibold mb-1">Euro Imports (MER-003)</div>
                <div className="flex justify-between"><span className="text-gray-400">Email:</span><span className="text-accent-300">euroimports@payflow.com</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Pass:</span><span className="text-accent-300">Merchant3!</span></div>
              </div>
              <div className="bg-white/5 px-3 py-2 rounded-lg font-mono">
                <div className="text-gray-300 font-semibold mb-1">Quick Pay Services (MER-004)</div>
                <div className="flex justify-between"><span className="text-gray-400">Email:</span><span className="text-accent-300">quickpay@payflow.com</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Pass:</span><span className="text-accent-300">Merchant4!</span></div>
              </div>
              <div className="bg-white/5 px-3 py-2 rounded-lg font-mono">
                <div className="text-gray-300 font-semibold mb-1">North Bay Exports (MER-005)</div>
                <div className="flex justify-between"><span className="text-gray-400">Email:</span><span className="text-accent-300">northbay@payflow.com</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Pass:</span><span className="text-accent-300">Merchant5!</span></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

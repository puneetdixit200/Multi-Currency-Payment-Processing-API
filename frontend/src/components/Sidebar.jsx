import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../App'
import { LayoutDashboard, CreditCard, Building2, Receipt, FileText, Settings, LogOut, Menu, X, Zap, Send, CheckCircle } from 'lucide-react'

// Admin navigation items
const adminNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/approvals', icon: CheckCircle, label: 'Approvals' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
  { to: '/merchants', icon: Building2, label: 'Merchants' },
  { to: '/settlements', icon: Receipt, label: 'Settlements' },
  { to: '/audit-logs', icon: FileText, label: 'Audit Logs' },
]

// Merchant navigation items
const merchantNavItems = [
  { to: '/merchant-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/send-money', icon: Send, label: 'Send Money' },
  { to: '/payments', icon: CreditCard, label: 'My Payments' },
]

export default function Sidebar({ isOpen, setIsOpen }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  
  const isAdmin = user?.role === 'admin'
  const navItems = isAdmin ? adminNavItems : merchantNavItems

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 256 : 80 }}
      className="fixed left-0 top-0 h-screen glass-card rounded-none border-r border-white/10 z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold gradient-text">PayFlow</span>
                {!isAdmin && (
                  <p className="text-xs text-gray-400 font-mono">{user?.merchantId}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Role Badge */}
      {isOpen && (
        <div className="px-4 py-2">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            isAdmin 
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
              : 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
          }`}>
            {isAdmin ? '👑 ADMIN' : '🏢 MERCHANT'}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-primary-600/50 to-primary-700/30 text-white shadow-lg shadow-primary-500/20'
                  : 'hover:bg-white/10 text-gray-400 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <AnimatePresence mode="wait">
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-medium whitespace-nowrap overflow-hidden"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-white/10">
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 ${!isOpen && 'justify-center'}`}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-sm font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-hidden"
              >
                <p className="font-medium text-sm truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={handleLogout}
          className={`mt-2 flex items-center gap-3 px-4 py-3 rounded-xl w-full hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors ${!isOpen && 'justify-center'}`}
        >
          <LogOut className="w-5 h-5" />
          {isOpen && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </motion.aside>
  )
}

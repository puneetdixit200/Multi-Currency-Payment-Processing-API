import { useState, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Payments from './pages/Payments'
import Merchants from './pages/Merchants'
import Settlements from './pages/Settlements'
import AuditLogs from './pages/AuditLogs'
import Login from './pages/Login'
import SendMoney from './pages/SendMoney'
import MerchantDashboard from './pages/MerchantDashboard'
import AdminApprovals from './pages/AdminApprovals'

// Auth Context
export const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const login = (userData, accessToken) => {
    setUser(userData)
    setToken(accessToken)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('token', accessToken)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }

  if (!user) {
    return (
      <AuthContext.Provider value={{ user, token, login, logout }}>
        <Login />
      </AuthContext.Provider>
    )
  }

  const isAdmin = user.role === 'admin'
  const defaultRoute = isAdmin ? '/dashboard' : '/merchant-dashboard'

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      <BrowserRouter>
        <div className="flex min-h-screen">
          <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
          <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
            <div className="p-6 lg:p-8">
              <Routes>
                <Route path="/" element={<Navigate to={defaultRoute} replace />} />
                {/* Admin Routes */}
                {isAdmin && <Route path="/dashboard" element={<Dashboard />} />}
                {isAdmin && <Route path="/approvals" element={<AdminApprovals />} />}
                {isAdmin && <Route path="/payments" element={<Payments />} />}
                {isAdmin && <Route path="/merchants" element={<Merchants />} />}
                {isAdmin && <Route path="/settlements" element={<Settlements />} />}
                {isAdmin && <Route path="/audit-logs" element={<AuditLogs />} />}
                {/* Merchant Routes */}
                {!isAdmin && <Route path="/merchant-dashboard" element={<MerchantDashboard />} />}
                {!isAdmin && <Route path="/send-money" element={<SendMoney />} />}
                {!isAdmin && <Route path="/payments" element={<Payments />} />}
                {/* Fallback */}
                <Route path="*" element={<Navigate to={defaultRoute} replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}

export default App


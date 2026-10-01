import { Route, Routes, Navigate, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import FloatingChatbot from './component/FloatingChatbot'
import Navbar from './component/Navbar'
import ComplaintForm from './component/ComplaintForm'
import ComplaintTracking from './pages/ComplaintTracking'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminPortal from './pages/AdminPortal'
import { useHealthCheck } from './hooks/useAPI'
import { useAuth } from './context/AuthContext'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/track" replace />
  return children
}

function App() {
  const { isHealthy, isLoading: healthLoading } = useHealthCheck()

  return (
    <div className='bg-[#0F1729]'>
      <Navbar />
      
      {/* API Health Status */}
      {!healthLoading && !isHealthy && (
        <div className='bg-red-900 border-b border-red-700 text-red-200 px-4 py-3'>
          <p className='text-sm'>
            ⚠️ Backend API is not responding. Some features may not work properly.
          </p>
        </div>
      )}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/complaint" element={<ProtectedRoute><ComplaintForm /></ProtectedRoute>} />
        <Route path="/track" element={<ProtectedRoute><ComplaintTracking /></ProtectedRoute>} />
        <Route path="/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminPortal /></AdminRoute>} />
        {/* P18 fix: 404 catch-all so unknown URLs show a friendly page */}
        <Route path="*" element={
          <div className="flex flex-col items-center justify-center min-h-screen text-white">
            <h1 className="text-6xl font-bold mb-4">404</h1>
            <p className="text-xl text-gray-400 mb-8">Page not found</p>
            <a href="/" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
              Go Home
            </a>
          </div>
        } />
      </Routes>
      <FloatingChatbot />
    </div>
  )
}

export default App

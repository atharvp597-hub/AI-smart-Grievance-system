import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

function Register() {
  const { isDark } = useTheme()
  const { register } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await register(formData)
      navigate('/track', { replace: true })
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`min-h-screen py-20 px-4 ${isDark ? 'bg-[#0F1729]' : 'bg-gray-50'}`}>
      <div className={`max-w-md mx-auto rounded-xl p-6 shadow-lg ${isDark ? 'bg-gray-800 text-white' : 'bg-white'}`}>
        <h1 className="text-2xl font-bold mb-6">Create Account</h1>

        {error && <div className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Name</label>
            <input
              type="text"
              required
              minLength={2}
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Phone (optional)</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'}`}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-linear-to-r from-cyan-500 to-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {isLoading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className={`mt-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-cyan-500 hover:text-cyan-400">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register

/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AUTH_STORAGE_KEY, authAPI, getAuthState } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const initial = getAuthState()
  const [token, setToken] = useState(() => initial?.token || null)
  const [user, setUser] = useState(() => initial?.user || null)
  const [loading] = useState(false)

  const persist = useCallback((nextToken, nextUser) => {
    setToken(nextToken)
    setUser(nextUser)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: nextToken, user: nextUser }))
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password })
    persist(res.data.access_token, res.data.user)
    return res.data.user
  }, [persist])

  const register = useCallback(async ({ name, email, phone, password }) => {
    const res = await authAPI.register({ name, email, phone, password })
    persist(res.data.access_token, res.data.user)
    return res.data.user
  }, [persist])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!token) return null
    const res = await authAPI.me()
    persist(token, res.data)
    return res.data
  }, [persist, token])

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: !!token,
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      refreshUser,
    }),
    [token, user, loading, login, register, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

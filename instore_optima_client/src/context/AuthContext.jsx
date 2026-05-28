import { createContext, useContext, useState, useEffect, useRef } from 'react'
import axiosClient from '../api/axiosClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })

  const login = (token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  // Heartbeat — poll every 8s while logged in.
  // If the account is deleted/deactivated the backend returns 401,
  // which the axios interceptor catches and redirects to /login immediately.
  useEffect(() => {
    if (!user) return
    const id = setInterval(() => {
      axiosClient.get('/api/auth/ping').catch(() => {})
    }, 2000)
    return () => clearInterval(id)
  }, [user])

  // Role helpers — use these throughout the app for consistent access control
  const role       = user?.role || ''
  const isAdmin    = role === 'Admin'
  const isManager  = role === 'Manager'
  const isStaff    = role === 'Staff'
  // canManage: Admin and Manager can approve/reject replenishments, create POs, manage users
  const canManage  = isAdmin || isManager

  return (
    <AuthContext.Provider value={{ user, login, logout, role, isAdmin, isManager, isStaff, canManage }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
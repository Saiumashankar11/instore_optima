// AuthContext.jsx
// Global authentication state for the app.
// Stores the logged-in user object, exposes login/logout helpers, and provides
// role-based convenience flags (isAdmin, isManager, isStaff, canManage).
// A background heartbeat ping keeps the session alive and detects deactivated accounts.

import { createContext, useContext, useState, useEffect, useRef } from 'react'
import axiosClient from '../api/axiosClient'

// The React context that holds auth state — consumed via useAuth()
const AuthContext = createContext(null)

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  // Initialise user from localStorage so the page doesn't flash as logged-out on refresh
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })

  // login — persist token + user to localStorage and update React state
  const login = (token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  // logout — wipe stored credentials and clear the user from state
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
    // Make auth state and helpers available to every component inside AuthProvider
    <AuthContext.Provider value={{ user, login, logout, role, isAdmin, isManager, isStaff, canManage }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook — components call useAuth() instead of useContext(AuthContext) directly
export function useAuth() {
  return useContext(AuthContext)
}
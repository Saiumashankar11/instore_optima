// axiosClient.js
// Pre-configured Axios instance used by every service file in the app.
// Automatically attaches the JWT Bearer token to every request and handles
// common error cases (401 session expiry, network down, timeout) in one place.

import axios from 'axios'

// Create the shared Axios instance.
// baseURL is empty so all request paths are relative (e.g. '/api/orders'),
// which lets the Vite dev proxy forward them to the .NET backend.
const axiosClient = axios.create({
  baseURL: '',
  timeout: 30000, // 30s timeout
})

// ── Request interceptor ───────────────────────────────────────────────────────
// Runs before every request — injects the stored JWT so the API can authenticate the call.
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor ──────────────────────────────────────────────────────
// Passes successful responses straight through.
// Translates common error conditions into consistent error shapes that the calling service can handle.
axiosClient.interceptors.response.use(
  (res) => res,
  (err) => {
    // 401 → session expired, redirect to login
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    // Suppress console noise for handled errors
    if (err.response) {
      // Server responded with error — let calling code handle it
      return Promise.reject(err)
    }
    // No response at all — the backend is unreachable (e.g. not started)
    if (err.code === 'ERR_NETWORK') {
      const customErr = new Error('Backend is not live. Please start the backend server and try again.')
      customErr.response = { data: { message: 'Backend is not live. Please start the backend server and try again.' } }
      return Promise.reject(customErr)
    }
    // Request took longer than the 30-second timeout
    if (err.code === 'ECONNABORTED') {
      const timeoutErr = new Error('Request timed out. Backend may be unresponsive.')
      timeoutErr.response = { data: { message: 'Request timed out. Backend may be unresponsive.' } }
      return Promise.reject(timeoutErr)
    }
    return Promise.reject(err)
  }
)

export default axiosClient
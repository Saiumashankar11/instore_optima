import axios from 'axios'

const axiosClient = axios.create({
  baseURL: '',
  timeout: 30000, // 30s timeout
})

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

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
    if (err.code === 'ERR_NETWORK') {
      const customErr = new Error('Backend is not live. Please start the backend server and try again.')
      customErr.response = { data: { message: 'Backend is not live. Please start the backend server and try again.' } }
      return Promise.reject(customErr)
    }
    if (err.code === 'ECONNABORTED') {
      const timeoutErr = new Error('Request timed out. Backend may be unresponsive.')
      timeoutErr.response = { data: { message: 'Request timed out. Backend may be unresponsive.' } }
      return Promise.reject(timeoutErr)
    }
    return Promise.reject(err)
  }
)

export default axiosClient
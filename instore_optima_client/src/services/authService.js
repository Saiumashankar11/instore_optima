import axiosClient from '../api/axiosClient'
export const loginApi     = (data) => axiosClient.post('/api/auth/login', data)
export const registerApi  = (data) => axiosClient.post('/api/auth/register', data)
export const verifyOtpApi = (data) => axiosClient.post('/api/auth/verify-otp', data)
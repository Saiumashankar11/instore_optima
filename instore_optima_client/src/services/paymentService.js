import axiosClient from '../api/axiosClient'
export const getAllPayments  = ()         => axiosClient.get('/api/payment')
export const getPaymentById  = (id)       => axiosClient.get(`/api/payment/${id}`)
export const createPayment   = (data)     => axiosClient.post('/api/payment', data)
export const updatePayment   = (id, data) => axiosClient.put(`/api/payment/${id}`, data)
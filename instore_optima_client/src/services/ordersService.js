import axiosClient from '../api/axiosClient'
export const getAllOrders  = ()         => axiosClient.get('/api/orders')
export const getOrderById  = (id)       => axiosClient.get(`/api/orders/${id}`)
export const createOrder   = (data)     => axiosClient.post('/api/orders', data)
export const updateOrder   = (id, data) => axiosClient.put(`/api/orders/${id}`, data)
export const deleteOrder   = (id)       => axiosClient.delete(`/api/orders/${id}`)
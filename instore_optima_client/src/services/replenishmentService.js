import axiosClient from '../api/axiosClient'

export const getAllReplenishments  = ()         => axiosClient.get('/api/Replenishment/orders')
export const getReplenishmentById  = (id)       => axiosClient.get(`/api/Replenishment/orders/${id}`)
export const createReplenishment   = (data)     => axiosClient.post('/api/Replenishment/orders', data)
export const updateReplenishment   = (id, data) => axiosClient.patch(`/api/Replenishment/orders/${id}/status`, data)
export const deleteReplenishment   = (id)       => axiosClient.delete(`/api/Replenishment/orders/${id}`)

export const getAllRules  = ()         => axiosClient.get('/api/Replenishment/rules')
export const createRule  = (data)     => axiosClient.post('/api/Replenishment/rules', data)
export const updateRule  = (id, data) => axiosClient.put(`/api/Replenishment/rules/${id}`, data)
export const deleteRule  = (id)       => axiosClient.delete(`/api/Replenishment/rules/${id}`)
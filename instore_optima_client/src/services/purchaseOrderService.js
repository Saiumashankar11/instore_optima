import axiosClient from '../api/axiosClient'

export const getAllPOs  = ()         => axiosClient.get('/api/PurchaseOrder')
export const getPOById  = (id)       => axiosClient.get(`/api/PurchaseOrder/${id}`)
export const createPO   = (data)     => axiosClient.post('/api/PurchaseOrder', data)
export const updatePO   = (id, data) => axiosClient.put(`/api/PurchaseOrder/${id}`, data)
export const deletePO   = (id)       => axiosClient.delete(`/api/PurchaseOrder/${id}`)
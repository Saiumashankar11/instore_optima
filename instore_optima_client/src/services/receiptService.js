import axiosClient from '../api/axiosClient'
export const getAllReceipts  = ()         => axiosClient.get('/api/receipt')
export const getReceiptById  = (id)       => axiosClient.get(`/api/receipt/${id}`)
export const createReceipt   = (data)     => axiosClient.post('/api/receipt', data)
export const updateReceipt   = (id, data) => axiosClient.put(`/api/receipt/${id}`, data)
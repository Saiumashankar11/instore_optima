import axiosClient from '../api/axiosClient'
export const getAllInvoices  = ()         => axiosClient.get('/api/invoice')
export const getInvoiceById  = (id)       => axiosClient.get(`/api/invoice/${id}`)
export const createInvoice   = (data)     => axiosClient.post('/api/invoice', data)
export const updateInvoice   = (id, data) => axiosClient.put(`/api/invoice/${id}`, data)
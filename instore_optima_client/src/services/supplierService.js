import axiosClient from '../api/axiosClient'
export const getAllSuppliers  = ()         => axiosClient.get('/api/supplier')
export const getSupplierById  = (id)       => axiosClient.get(`/api/supplier/${id}`)
export const createSupplier   = (data)     => axiosClient.post('/api/supplier', data)
export const updateSupplier   = (id, data) => axiosClient.put(`/api/supplier/${id}`, data)
export const deleteSupplier   = (id)       => axiosClient.delete(`/api/supplier/${id}`)
import axiosClient from '../api/axiosClient'
export const getAllProducts  = ()         => axiosClient.get('/api/products')
export const createProduct  = (data)     => axiosClient.post('/api/products', data)
export const updateProduct  = (id, data) => axiosClient.put(`/api/products/${id}`, data)
export const deleteProduct  = (id)       => axiosClient.delete(`/api/products/${id}`)
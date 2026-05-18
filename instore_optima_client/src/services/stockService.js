import axiosClient from '../api/axiosClient'
export const getAllStock  = ()         => axiosClient.get('/api/stock')
export const getStockById = (id)      => axiosClient.get(`/api/stock/${id}`)
export const updateStock  = (id, data) => axiosClient.put(`/api/stock/${id}`, data)
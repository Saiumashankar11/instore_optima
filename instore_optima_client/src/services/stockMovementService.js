import axiosClient from '../api/axiosClient'

export const getAllMovements  = ()     => axiosClient.get('/api/StockMovement')
export const recordMovement  = (data) => axiosClient.post('/api/StockMovement', data)
export const deleteMovement  = (id)   => axiosClient.delete(`/api/StockMovement/${id}`)
import axiosClient from '../api/axiosClient'
export const getItemsByOrderId  = (orderId) => axiosClient.get(`/api/orderitems/order/${orderId}`)
export const createOrderItem    = (data)    => axiosClient.post('/api/orderitems', data)
export const updateOrderItem    = (id, data) => axiosClient.put(`/api/orderitems/${id}`, data)
export const deleteOrderItem    = (id)      => axiosClient.delete(`/api/orderitems/${id}`)
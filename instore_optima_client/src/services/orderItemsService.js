// orderItemsService.js
// API calls for individual line items within a customer order.
// Each order can have multiple items (product + quantity + price).

import axiosClient from '../api/axiosClient'
// GET    /api/orderitems/order/:orderId — fetch all line items belonging to a specific order
export const getItemsByOrderId  = (orderId) => axiosClient.get(`/api/orderitems/order/${orderId}`)
// POST   /api/orderitems            — add a new line item to an order
export const createOrderItem    = (data)    => axiosClient.post('/api/orderitems', data)
// PUT    /api/orderitems/:id        — update an existing line item (e.g. change quantity)
export const updateOrderItem    = (id, data) => axiosClient.put(`/api/orderitems/${id}`, data)
// DELETE /api/orderitems/:id        — remove a line item from an order
export const deleteOrderItem    = (id)      => axiosClient.delete(`/api/orderitems/${id}`)
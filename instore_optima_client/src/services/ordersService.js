// ordersService.js
// API calls for the customer orders module (sales/finance).
// Orders group one or more order items and track fulfilment status.

import axiosClient from '../api/axiosClient'
// GET    /api/orders      — fetch all orders (used by the orders list page)
export const getAllOrders  = ()         => axiosClient.get('/api/orders')
// GET    /api/orders/:id  — fetch a single order with its details
export const getOrderById  = (id)       => axiosClient.get(`/api/orders/${id}`)
// POST   /api/orders      — create a new customer order
export const createOrder   = (data)     => axiosClient.post('/api/orders', data)
// PUT    /api/orders/:id  — update order fields (status, customer info, etc.)
export const updateOrder   = (id, data) => axiosClient.put(`/api/orders/${id}`, data)
// DELETE /api/orders/:id  — permanently delete an order
export const deleteOrder   = (id)       => axiosClient.delete(`/api/orders/${id}`)
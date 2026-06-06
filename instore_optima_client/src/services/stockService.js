// stockService.js
// API calls for current stock level records (inventory module).
// Each stock record ties a product to a quantity and warehouse location.
// Low-stock records trigger the alert badges and replenishment flow.

import axiosClient from '../api/axiosClient'
// GET    /api/stock       — fetch all stock records across all products
export const getAllStock  = ()         => axiosClient.get('/api/stock')
// GET    /api/stock/:id   — fetch the stock record for a specific product
export const getStockById = (id)      => axiosClient.get(`/api/stock/${id}`)
// POST   /api/stock       — create a new stock record (usually done when adding a product)
export const createStock  = (data)    => axiosClient.post('/api/stock', data)
// PUT    /api/stock/:id   — update current stock quantity (manual adjustment)
export const updateStock  = (id, data) => axiosClient.put(`/api/stock/${id}`, data)
// DELETE /api/stock/:id   — remove a stock record
export const deleteStock  = (id)      => axiosClient.delete(`/api/stock/${id}`)
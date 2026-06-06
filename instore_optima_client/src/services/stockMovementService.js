// stockMovementService.js
// API calls for the stock movement audit log (inventory module).
// Every time stock changes (sale, adjustment, receipt) a movement record is created,
// giving a traceable history of why stock levels changed.

import axiosClient from '../api/axiosClient'

// GET    /api/StockMovement      — fetch the full list of stock movement records
export const getAllMovements  = ()     => axiosClient.get('/api/StockMovement')
// POST   /api/StockMovement      — log a manual stock movement (e.g. adjustment or correction)
export const recordMovement  = (data) => axiosClient.post('/api/StockMovement', data)
// DELETE /api/StockMovement/:id  — remove a movement record (admin correction)
export const deleteMovement  = (id)   => axiosClient.delete(`/api/StockMovement/${id}`)
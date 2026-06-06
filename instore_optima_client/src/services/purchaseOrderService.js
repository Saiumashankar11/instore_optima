// purchaseOrderService.js
// API calls for Purchase Orders (POs) — the procurement module.
// POs are raised by managers to order stock from suppliers after a replenishment request is approved.

import axiosClient from '../api/axiosClient'

// GET    /api/PurchaseOrder      — list all purchase orders
export const getAllPOs  = ()         => axiosClient.get('/api/PurchaseOrder')
// GET    /api/PurchaseOrder/:id  — fetch a single purchase order by ID
export const getPOById  = (id)       => axiosClient.get(`/api/PurchaseOrder/${id}`)
// POST   /api/PurchaseOrder      — create a new purchase order
export const createPO   = (data)     => axiosClient.post('/api/PurchaseOrder', data)
// PUT    /api/PurchaseOrder/:id  — update PO fields (status, quantities, supplier, etc.)
export const updatePO   = (id, data) => axiosClient.put(`/api/PurchaseOrder/${id}`, data)
// DELETE /api/PurchaseOrder/:id  — cancel / delete a purchase order
export const deletePO   = (id)       => axiosClient.delete(`/api/PurchaseOrder/${id}`)
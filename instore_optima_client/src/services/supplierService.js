// supplierService.js
// API calls for the supplier / vendor directory (procurement module).
// Products are linked to suppliers; purchase orders are sent to them.

import axiosClient from '../api/axiosClient'
// GET    /api/supplier      — list all suppliers
export const getAllSuppliers  = ()         => axiosClient.get('/api/supplier')
// GET    /api/supplier/:id  — fetch a single supplier's details
export const getSupplierById  = (id)       => axiosClient.get(`/api/supplier/${id}`)
// POST   /api/supplier      — add a new supplier to the directory
export const createSupplier   = (data)     => axiosClient.post('/api/supplier', data)
// PUT    /api/supplier/:id  — update supplier information (contact, email, etc.)
export const updateSupplier   = (id, data) => axiosClient.put(`/api/supplier/${id}`, data)
// DELETE /api/supplier/:id  — remove a supplier from the directory
export const deleteSupplier   = (id)       => axiosClient.delete(`/api/supplier/${id}`)
// receiptService.js
// API calls for goods receipts (procurement module).
// A receipt is created when stock physically arrives at the store against a purchase order.

import axiosClient from '../api/axiosClient'
// GET  /api/receipt      — fetch all goods receipt records
export const getAllReceipts  = ()         => axiosClient.get('/api/receipt')
// GET  /api/receipt/:id  — fetch a single receipt by ID
export const getReceiptById  = (id)       => axiosClient.get(`/api/receipt/${id}`)
// POST /api/receipt      — record a new goods receipt (marks stock as arrived)
export const createReceipt   = (data)     => axiosClient.post('/api/receipt', data)
// PUT  /api/receipt/:id  — update receipt details (e.g. adjust quantities received)
export const updateReceipt   = (id, data) => axiosClient.put(`/api/receipt/${id}`, data)
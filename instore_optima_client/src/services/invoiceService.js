// invoiceService.js
// API calls for customer invoice management (finance module).
// Invoices are generated from orders and can be updated (e.g. marked as paid).

import axiosClient from '../api/axiosClient'
// GET  /api/invoice      — fetch all invoices (used in the invoice list page)
export const getAllInvoices  = ()         => axiosClient.get('/api/invoice')
// GET  /api/invoice/:id  — fetch a single invoice by its ID
export const getInvoiceById  = (id)       => axiosClient.get(`/api/invoice/${id}`)
// POST /api/invoice      — create a new invoice record
export const createInvoice   = (data)     => axiosClient.post('/api/invoice', data)
// PUT  /api/invoice/:id  — update an existing invoice (e.g. change status to Paid)
export const updateInvoice   = (id, data) => axiosClient.put(`/api/invoice/${id}`, data)
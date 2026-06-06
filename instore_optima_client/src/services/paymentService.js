// paymentService.js
// API calls for the payments module (finance).
// Payments are linked to orders and track amount, method, and payment date.

import axiosClient from '../api/axiosClient'
// GET    /api/payment      — fetch all payment records
export const getAllPayments  = ()         => axiosClient.get('/api/payment')
// GET    /api/payment/:id  — fetch a single payment by ID
export const getPaymentById  = (id)       => axiosClient.get(`/api/payment/${id}`)
// POST   /api/payment      — record a new payment against an order
export const createPayment   = (data)     => axiosClient.post('/api/payment', data)
// PUT    /api/payment/:id  — update payment details (e.g. correct amount or method)
export const updatePayment   = (id, data) => axiosClient.put(`/api/payment/${id}`, data)
// DELETE /api/payment/:id  — remove a payment record
export const deletePayment   = (id)       => axiosClient.delete(`/api/payment/${id}`)
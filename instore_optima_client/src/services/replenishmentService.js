// replenishmentService.js
// API calls for the replenishment module (inventory / procurement).
// Staff raise replenishment orders when stock falls below the minimum threshold;
// managers approve or reject them, then create a Purchase Order to fulfil them.
// Replenishment rules define which products trigger automatic low-stock alerts.

import axiosClient from '../api/axiosClient'

// ── Replenishment orders ───────────────────────────────────────────────────────
// GET    /api/Replenishment/orders              — list all replenishment requests
export const getAllReplenishments  = ()         => axiosClient.get('/api/Replenishment/orders')
// GET    /api/Replenishment/orders/:id          — fetch a single request by ID
export const getReplenishmentById  = (id)       => axiosClient.get(`/api/Replenishment/orders/${id}`)
// POST   /api/Replenishment/orders              — raise a new replenishment request
export const createReplenishment   = (data)     => axiosClient.post('/api/Replenishment/orders', data)
// PATCH  /api/Replenishment/orders/:id/status   — approve or reject a request (manager action)
export const updateReplenishment   = (id, data) => axiosClient.patch(`/api/Replenishment/orders/${id}/status`, data)
// DELETE /api/Replenishment/orders/:id          — delete a replenishment request
export const deleteReplenishment   = (id)       => axiosClient.delete(`/api/Replenishment/orders/${id}`)

// ── Replenishment rules ────────────────────────────────────────────────────────
// GET    /api/Replenishment/rules       — list all auto-replenishment rules
export const getAllRules  = ()         => axiosClient.get('/api/Replenishment/rules')
// POST   /api/Replenishment/rules       — create a new rule (product + threshold + reorder qty)
export const createRule  = (data)     => axiosClient.post('/api/Replenishment/rules', data)
// PUT    /api/Replenishment/rules/:id   — update an existing rule
export const updateRule  = (id, data) => axiosClient.put(`/api/Replenishment/rules/${id}`, data)
// DELETE /api/Replenishment/rules/:id   — delete a rule
export const deleteRule  = (id)       => axiosClient.delete(`/api/Replenishment/rules/${id}`)
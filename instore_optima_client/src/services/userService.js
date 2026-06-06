// userService.js
// API calls for user management (admin module) and the audit log.
// Admins can list, edit, and delete user accounts.
// Audit logs record every significant action taken in the system for compliance/traceability.

import axiosClient from '../api/axiosClient'

// ── User management ────────────────────────────────────────────────────────────
// GET    /api/user      — list all registered users (Admin only)
export const getAllUsers  = ()         => axiosClient.get('/api/user')
// GET    /api/user/:id  — fetch a specific user's details
export const getUserById  = (id)       => axiosClient.get(`/api/user/${id}`)
// PUT    /api/user/:id  — update user details or role (Admin only)
export const updateUser   = (id, data) => axiosClient.put(`/api/user/${id}`, data)
// DELETE /api/user/:id  — deactivate / delete a user account (Admin only)
export const deleteUser   = (id)       => axiosClient.delete(`/api/user/${id}`)

// ── Audit log ──────────────────────────────────────────────────────────────────
// GET /api/auditlog          — fetch the full system-wide audit log
export const getAllAuditLogs    = ()  => axiosClient.get('/api/auditlog')
// GET /api/auditlog/user/:id — fetch all audit entries for a specific user
export const getLogsByUserId    = (id) => axiosClient.get(`/api/auditlog/user/${id}`)
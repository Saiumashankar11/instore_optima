// internalMessageService.js
// API calls for the in-app messaging system between staff, managers, and admins.
// Covers mailbox views (inbox, sent, drafts, starred, trash) and message actions.

import axiosClient from '../api/axiosClient'

// ── Mailbox views ──────────────────────────────────────────────────────────────
// GET /api/messages/inbox   — all messages received by the current user
export const getInbox          = ()         => axiosClient.get('/api/messages/inbox')
// GET /api/messages/sent    — messages the current user has sent
export const getSent           = ()         => axiosClient.get('/api/messages/sent')
// GET /api/messages/drafts  — saved drafts not yet sent
export const getDrafts         = ()         => axiosClient.get('/api/messages/drafts')
// GET /api/messages/starred — messages the user has starred for quick access
export const getStarred        = ()         => axiosClient.get('/api/messages/starred')
// GET /api/messages/trash   — soft-deleted messages
export const getTrash          = ()         => axiosClient.get('/api/messages/trash')

// ── Badge / recipients ─────────────────────────────────────────────────────────
// GET /api/messages/unread-count — number of unread inbox messages (used for the navbar badge)
export const getUnreadCount    = ()         => axiosClient.get('/api/messages/unread-count')
// GET /api/messages/recipients  — list of users the current user can message
export const getRecipients     = ()         => axiosClient.get('/api/messages/recipients')

// ── Actions ───────────────────────────────────────────────────────────────────
// POST /api/messages             — send a new message (or save as draft)
export const sendMessage       = (data)     => axiosClient.post('/api/messages', data)
// PUT  /api/messages/:id/read    — mark a specific message as read
export const markAsRead        = (id)       => axiosClient.put(`/api/messages/${id}/read`)
// PUT  /api/messages/:id/star    — toggle the star flag on a message
export const toggleStar        = (id)       => axiosClient.put(`/api/messages/${id}/star`)
// PUT  /api/messages/:id/trash   — move a message to the trash (soft delete)
export const moveToTrash       = (id)       => axiosClient.put(`/api/messages/${id}/trash`)
// PUT  /api/messages/:id/restore — move a trashed message back to inbox
export const restoreFromTrash  = (id)       => axiosClient.put(`/api/messages/${id}/restore`)
// DELETE /api/messages/:id       — permanently delete a message; `sent` flag selects inbox vs sent box
export const deleteMessage     = (id, sent) => axiosClient.delete(`/api/messages/${id}?sent=${sent}`)

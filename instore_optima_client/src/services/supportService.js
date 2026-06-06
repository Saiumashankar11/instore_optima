// supportService.js
// API calls for the "Contact Support" feature.
// Allows users to send a support enquiry from within the app; the backend emails the support team.

import axiosClient from '../api/axiosClient'

// POST /api/support/contact — submit a support message (subject + body) on behalf of the logged-in user
export const contactSupportApi = (data) => axiosClient.post('/api/support/contact', data)

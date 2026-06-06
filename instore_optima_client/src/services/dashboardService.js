// dashboardService.js
// API calls for the admin/manager dashboard summary panel.
// The backend aggregates multiple data sources into a single response
// to avoid the cost of six separate full-table API calls on page load.

import axiosClient from '../api/axiosClient'

// Single aggregated call replacing six full-table fetches on the dashboard.
// GET /api/dashboard/summary — returns counts and totals for orders, stock, payments, etc.
export const getDashboardSummary = () => axiosClient.get('/api/dashboard/summary')

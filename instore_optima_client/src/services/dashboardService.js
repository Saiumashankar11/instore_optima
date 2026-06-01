import axiosClient from '../api/axiosClient'

// Single aggregated call replacing six full-table fetches on the dashboard.
export const getDashboardSummary = () => axiosClient.get('/api/dashboard/summary')

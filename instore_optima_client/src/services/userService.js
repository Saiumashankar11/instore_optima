import axiosClient from '../api/axiosClient'
export const getAllUsers  = ()         => axiosClient.get('/api/user')
export const getUserById  = (id)       => axiosClient.get(`/api/user/${id}`)
export const updateUser   = (id, data) => axiosClient.put(`/api/user/${id}`, data)
export const deleteUser   = (id)       => axiosClient.delete(`/api/user/${id}`)
export const getAllAuditLogs    = ()  => axiosClient.get('/api/auditlog')
export const getLogsByUserId    = (id) => axiosClient.get(`/api/auditlog/user/${id}`)
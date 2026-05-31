import axiosClient from '../api/axiosClient'

export const contactSupportApi = (data) => axiosClient.post('/api/support/contact', data)

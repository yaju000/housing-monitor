import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const searchProjects = (params) => api.get('/projects', { params }).then(r => r.data)
export const getProject = (id) => api.get(`/projects/${id}`).then(r => r.data)
export const createProject = (data) => api.post('/projects', data).then(r => r.data)
export const getTransactions = (id) => api.get(`/projects/${id}/transactions`).then(r => r.data)
export const getListings = (id) => api.get(`/projects/${id}/listings`).then(r => r.data)
export const createListing = (id, data) => api.post(`/projects/${id}/listings`, data).then(r => r.data)
export const subscribeAlert = (data) => api.post('/alerts', data).then(r => r.data)
export const unsubscribeAlert = (token) => api.delete(`/alerts/${token}`).then(r => r.data)

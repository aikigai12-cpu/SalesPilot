import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export default api

// Leads
export const getLeads = (params?: Record<string, string>) => api.get('/leads/', { params })
export const getLead = (id: string) => api.get(`/leads/${id}`)
export const createLead = (data: Record<string, unknown>) => api.post('/leads/', data)
export const updateLead = (id: string, data: Record<string, unknown>) => api.put(`/leads/${id}`, data)

// Call logs
export const getCallLogs = (leadId: string) => api.get(`/leads/${leadId}/calls`)
export const addCallLog = (leadId: string, data: Record<string, unknown>) => api.post(`/leads/${leadId}/calls`, data)

// WhatsApp logs
export const getWhatsappLogs = (leadId: string) => api.get(`/leads/${leadId}/whatsapp`)
export const parseWhatsapp = (leadId: string, text: string) => api.post(`/leads/${leadId}/whatsapp`, { text })

// Cohorts
export const getCohorts = () => api.get('/cohorts/')
export const getCohortLeads = (cohortId: string) => api.get(`/cohorts/${cohortId}/leads`)
export const assignCohort = (cohortId: string, leadId: string, standing?: string) =>
  api.post(`/cohorts/${cohortId}/leads`, { lead_id: leadId, standing })
export const updateStanding = (cohortId: string, leadId: string, standing: string) =>
  api.put(`/cohorts/${cohortId}/leads/${leadId}`, { standing })

// Dashboard
export const getDashboard = () => api.get('/dashboard/')

// Reminders
export const getReminders = () => api.get('/reminders/')
export const snoozeReminder = (id: string, days?: number) => api.post(`/reminders/${id}/snooze`, { days })
export const dismissReminder = (id: string) => api.post(`/reminders/${id}/dismiss`)

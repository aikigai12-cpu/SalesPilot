import axios from 'axios'
import { supabase } from './supabase'

const BASE = import.meta.env.VITE_API_URL || '/api'
const api = axios.create({ baseURL: BASE })

// attach auth token + optional view_as on every request
api.interceptors.request.use(async config => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers['Authorization'] = `Bearer ${session.access_token}`
  }
  // admin viewing another user's data
  const viewAs = sessionStorage.getItem('view_as_user_id')
  if (viewAs) config.headers['X-View-As'] = viewAs
  return config
})

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
  api.post(`/cohorts/${cohortId}/leads/${leadId}`, { standing })
export const bulkAssignCohort = (cohortId: string, leadIds: string[]) =>
  api.post(`/cohorts/${cohortId}/bulk-assign`, { lead_ids: leadIds })
export const updateStanding = (cohortId: string, leadId: string, standing: string) =>
  api.put(`/cohorts/${cohortId}/leads/${leadId}`, { standing })
export const trackLead = (cohortId: string, leadId: string, data: { next_followup?: string | null; quick_note?: string }) =>
  api.patch(`/cohorts/${cohortId}/leads/${leadId}/track`, data)

// Dashboard
export const getDashboard = () => api.get('/dashboard/')

// Reminders
export const getReminders = () => api.get('/reminders/')
export const snoozeReminder = (id: string, days?: number) => api.post(`/reminders/${id}/snooze`, { days })
export const dismissReminder = (id: string) => api.post(`/reminders/${id}/dismiss`)

// Admin
export const getAdminUsers = () => api.get('/admin/users')

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard, dismissReminder, snoozeReminder } from '../api'

interface Lead {
  id: string; name: string; phone: string; score: number
  business_type?: string; city?: string; source?: string
  ai_recommendation?: string; score_reason?: string
}
interface Reminder {
  id: string; message: string; fire_at: string
  leads: { name: string; score: number }
}
interface Stats {
  total: number; hot: number; drop: number
  active_cohort?: { name: string; id: string }
  active_count: number; future_count: number
}

const avColors = ['av-g','av-b','av-o','av-p']
function av(name: string) { return avColors[name.charCodeAt(0) % 4] }
function initials(name: string) { return name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase() }
function sp(score: number) { return score>=70?'sp-h':score>=40?'sp-m':'sp-l' }

interface Props { openModal: (name: 'addLead'|'logCall'|'whatsapp'|'newCohort', leadId?: string) => void }

export default function Dashboard({ openModal }: Props) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [priority, setPriority] = useState<Lead[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = () => {
    getDashboard().then(r => {
      setStats(r.data.stats)
      setPriority(r.data.priority_leads)
      setReminders(r.data.reminders)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const handler = () => load()
    window.addEventListener('leads-updated', handler)
    return () => window.removeEventListener('leads-updated', handler)
  }, [])

  const handleDismiss = async (id: string) => {
    await dismissReminder(id)
    setReminders(p => p.filter(r => r.id !== id))
  }
  const handleSnooze = async (id: string) => {
    await snoozeReminder(id, 2)
    setReminders(p => p.filter(r => r.id !== id))
  }

  if (loading) return <div style={{color:'var(--text3)',padding:20}}>Loading...</div>

  return (
    <>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Leads</div>
          <div className="stat-val">{stats?.total ?? 0}</div>
          <div className="stat-sub">All cohorts combined</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{stats?.active_cohort?.name ?? 'Active Cohort'}</div>
          <div className="stat-val c-green">{stats?.active_count ?? 0}</div>
          <div className="stat-sub">In active cohort</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Future Cohort</div>
          <div className="stat-val c-orange">{stats?.future_count ?? 0}</div>
          <div className="stat-sub">Not yet assigned</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Hot Leads</div>
          <div className="stat-val c-green">{stats?.hot ?? 0}</div>
          <div className="stat-sub">Score 70+</div>
        </div>
      </div>

      <div className="two-col">
        <div>
          <div className="sec">
            <div className="sec-title">Priority Leads</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leads')}>All leads</button>
          </div>

          {priority.length === 0 && (
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'20px 16px', textAlign:'center' }}>
              <div style={{ fontSize:12, color:'var(--text3)', marginBottom:10 }}>No leads yet. Add your first lead to get started.</div>
              <button className="btn btn-primary btn-sm" onClick={() => openModal('addLead')}>+ Add Lead</button>
            </div>
          )}

          {priority.map(lead => (
            <div key={lead.id} className="lead-card" onClick={() => navigate(`/leads/${lead.id}`)}>
              <div className="lead-row">
                <div className={`avatar ${av(lead.name)}`}>{initials(lead.name)}</div>
                <div className="lead-info">
                  <div className="lead-name">{lead.name}</div>
                  <div className="lead-biz">{lead.business_type}{lead.city ? ` · ${lead.city}` : ''}{lead.source ? ` · ${lead.source}` : ''}</div>
                </div>
                <div className={`score-pill ${sp(lead.score)}`}>{lead.score}</div>
              </div>
              {lead.ai_recommendation && (
                <div className={`ai-line${lead.score < 40 ? ' warn' : ''}`} style={{marginTop:8}}>
                  <strong>AI:</strong> {lead.ai_recommendation}
                </div>
              )}
            </div>
          ))}
        </div>

        <div>
          <div className="sec"><div className="sec-title">Today's Reminders</div></div>

          {reminders.length === 0 && (
            <div className="rem-card" style={{border:'1px solid var(--border)'}}>
              <div style={{fontSize:11,color:'var(--text3)'}}>No reminders due today. You're all caught up!</div>
            </div>
          )}

          {reminders.slice(0,3).map(r => (
            <div key={r.id} className="rem-card">
              <div className="rem-top">
                <div className="rem-dot" />
                <div>
                  <div className="rem-name">{r.leads?.name}</div>
                  <div className="rem-when">Due: {r.fire_at}</div>
                </div>
              </div>
              <div className="rem-msg">{r.message}</div>
              <div className="rem-actions">
                <button className="btn btn-primary btn-sm" onClick={() => openModal('logCall')}>Log Call</button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleSnooze(r.id)}>Snooze</button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDismiss(r.id)}>Done</button>
              </div>
            </div>
          ))}

          {stats?.active_cohort && (
            <div style={{marginTop:10}}>
              <div className="sec"><div className="sec-title">AI Pulse</div></div>
              <div className="ai-box" style={{marginBottom:0}}>
                <div className="ai-box-title">{stats.active_cohort.name}</div>
                <p><strong>{stats.active_count} leads</strong> in this cohort. Focus on Promised leads this week to maximise conversion.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

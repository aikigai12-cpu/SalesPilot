import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getReminders, snoozeReminder, dismissReminder } from '../api'

interface Reminder {
  id: string; message: string; fire_at: string; snoozed_until?: string
  leads: { id: string; name: string; score: number }
}

function sp(score: number) { return score>=70?'sp-h':score>=40?'sp-m':'sp-l' }

interface Props { openModal: (name: 'addLead'|'logCall'|'whatsapp'|'newCohort', leadId?: string) => void }

export default function Reminders({ openModal }: Props) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    getReminders().then(r => setReminders(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const h = () => load()
    window.addEventListener('leads-updated', h)
    return () => window.removeEventListener('leads-updated', h)
  }, [])

  const handleSnooze = async (id: string) => {
    await snoozeReminder(id, 2)
    load()
  }
  const handleDismiss = async (id: string) => {
    await dismissReminder(id)
    setReminders(p => p.filter(r => r.id !== id))
  }

  const today = reminders.filter(r => !r.snoozed_until)
  const snoozed = reminders.filter(r => r.snoozed_until)

  return (
    <>
      <div className="sec" style={{marginBottom:12}}>
        <div className="sec-title">Follow-up Reminders</div>
        <div style={{fontSize:11,color:'var(--text3)'}}>{today.length} due</div>
      </div>

      {loading && <div style={{color:'var(--text3)',fontSize:12}}>Loading...</div>}

      {!loading && reminders.length === 0 && (
        <div style={{textAlign:'center',padding:'40px 0',color:'var(--text3)'}}>
          <div style={{fontSize:32,marginBottom:10}}>✅</div>
          <div style={{fontSize:13}}>All caught up! No reminders pending.</div>
        </div>
      )}

      {today.map(r => (
        <div key={r.id} className="rem-card" style={{border:'1px solid var(--border2)'}}>
          <div className="rem-top">
            <div className="rem-dot" style={{background:'var(--orange)'}} />
            <div style={{flex:1}}>
              <div className="rem-name"
                style={{cursor:'pointer'}}
                onClick={() => navigate(`/leads/${r.leads?.id}`)}
              >
                {r.leads?.name}
                <span className={`score-pill ${sp(r.leads?.score)}`} style={{marginLeft:8}}>{r.leads?.score}</span>
              </div>
              <div className="rem-when">Due: {r.fire_at?.split('T')[0] || r.fire_at}</div>
            </div>
          </div>
          <div className="rem-msg">{r.message}</div>
          <div className="rem-actions">
            <button className="btn btn-primary btn-sm" onClick={() => {
              navigate(`/leads/${r.leads?.id}`)
              setTimeout(() => openModal('logCall', r.leads?.id), 100)
            }}>Log Call</button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleSnooze(r.id)}>Snooze 2d</button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleDismiss(r.id)}>Done ✓</button>
          </div>
        </div>
      ))}

      {snoozed.length > 0 && (
        <>
          <div className="sec" style={{marginTop:18,marginBottom:10}}>
            <div className="sec-title" style={{color:'var(--text3)'}}>Snoozed ({snoozed.length})</div>
          </div>
          {snoozed.map(r => (
            <div key={r.id} className="rem-card" style={{border:'1px solid var(--border)',opacity:0.6}}>
              <div className="rem-top">
                <div className="rem-dot" style={{background:'var(--text3)'}} />
                <div>
                  <div className="rem-name">{r.leads?.name}</div>
                  <div className="rem-when">Snoozed until: {r.snoozed_until?.split('T')[0] || r.snoozed_until}</div>
                </div>
              </div>
              <div className="rem-msg">{r.message}</div>
              <div className="rem-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => handleDismiss(r.id)}>Dismiss</button>
              </div>
            </div>
          ))}
        </>
      )}
    </>
  )
}

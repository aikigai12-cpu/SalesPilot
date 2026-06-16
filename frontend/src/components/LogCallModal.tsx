import { useState } from 'react'
import { addCallLog } from '../api'

interface Props {
  open: boolean
  leadId: string | null
  onClose: () => void
  onSaved: () => void
}

export default function LogCallModal({ open, leadId, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    duration_min: '',
    outcome: 'Connected',
    objection: '',
    interest_rating: 3,
    followup_date: '',
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!leadId) return
    setSaving(true)
    try {
      await addCallLog(leadId, { ...form, duration_min: Number(form.duration_min) || 0 })
      onSaved()
      setForm({ date: new Date().toISOString().split('T')[0], duration_min: '', outcome: 'Connected', objection: '', interest_rating: 3, followup_date: '', notes: '' })
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hd">
          <div className="modal-title">Log Call</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="form-row">
          <div className="fg">
            <label className="fl">Date</label>
            <input className="fi" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="fg">
            <label className="fl">Duration (min)</label>
            <input className="fi" type="number" placeholder="10" value={form.duration_min} onChange={e => set('duration_min', e.target.value)} />
          </div>
        </div>

        <div className="fg">
          <label className="fl">Outcome</label>
          <select className="fs" value={form.outcome} onChange={e => set('outcome', e.target.value)}>
            <option>Connected</option>
            <option>Answered — good conversation</option>
            <option>Answered — short call</option>
            <option>Not answered</option>
            <option>Callback requested</option>
            <option>Said will join cohort</option>
            <option>Not Interested</option>
          </select>
        </div>

        <div className="fg">
          <label className="fl">Objection</label>
          <select className="fs" value={form.objection} onChange={e => set('objection', e.target.value)}>
            <option value="">None</option>
            <option value="price">Price too high</option>
            <option value="time">No time right now</option>
            <option value="partner_decision">Partner / spouse decision</option>
            <option value="not_sure">Not sure yet</option>
            <option value="not_interested">Not interested</option>
          </select>
        </div>

        <div className="fg">
          <label className="fl">Interest Rating</label>
          <div className="rb-row">
            {[1,2,3,4,5].map(n => (
              <button key={n} className={`rb${form.interest_rating === n ? ' active' : ''}`} onClick={() => set('interest_rating', n)}>{n}</button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 5 }}>1 = Just polite · 3 = Genuinely thinking · 5 = Very serious</div>
        </div>

        <div className="fg">
          <label className="fl">Next Follow-up Date</label>
          <input className="fi" type="date" value={form.followup_date} onChange={e => set('followup_date', e.target.value)} />
        </div>

        <div className="fg">
          <label className="fl">Notes</label>
          <textarea className="ft" placeholder="What did they say on this call..." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving || !leadId}>
            {saving ? 'Saving & Scoring...' : leadId ? 'Save + AI Rescore' : 'Select a lead first'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
        {!leadId && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>Open a lead profile first, then log a call from there.</div>}
      </div>
    </div>
  )
}

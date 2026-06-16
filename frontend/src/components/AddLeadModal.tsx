import { useState } from 'react'
import { createLead } from '../api'
import type { Cohort } from '../App'

interface Props {
  open: boolean
  cohorts: Cohort[]
  onClose: () => void
  onSaved: () => void
}

export default function AddLeadModal({ open, cohorts, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: '', phone: '', whatsapp: '',
    business_type: 'Manufacturing', city: '',
    team_size: '1–5', source: 'Referral', cohort_id: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.name || !form.phone) { setError('Name and Phone are required'); return }
    setSaving(true)
    setError('')
    try {
      await createLead(form)
      setForm({ name: '', phone: '', whatsapp: '', business_type: 'Manufacturing', city: '', team_size: '1–5', source: 'Referral', cohort_id: '' })
      onSaved()
    } catch {
      setError('Failed to save. Make sure backend is running.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const activeCohort = cohorts.find(c => c.is_active)
  const futureCohort = cohorts.find(c => c.is_future)

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hd">
          <div className="modal-title">Add New Lead</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="form-row">
          <div className="fg">
            <label className="fl">Full Name *</label>
            <input className="fi" placeholder="Rajesh Mehta" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="fg">
            <label className="fl">Phone *</label>
            <input className="fi" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
        </div>

        <div className="fg">
          <label className="fl">WhatsApp Number</label>
          <input className="fi" placeholder="Same or different" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
        </div>

        <div className="form-sec">Business Profile</div>

        <div className="form-row">
          <div className="fg">
            <label className="fl">Business Type</label>
            <select className="fs" value={form.business_type} onChange={e => set('business_type', e.target.value)}>
              {['Manufacturing','Retail','Import/Export','Consulting','Services','Other'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="fg">
            <label className="fl">City</label>
            <input className="fi" placeholder="Mumbai" value={form.city} onChange={e => set('city', e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <div className="fg">
            <label className="fl">Team Size</label>
            <select className="fs" value={form.team_size} onChange={e => set('team_size', e.target.value)}>
              {['1–5','6–15','16–50','50+'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="fg">
            <label className="fl">Source</label>
            <select className="fs" value={form.source} onChange={e => set('source', e.target.value)}>
              {['Referral','Instagram','LinkedIn','Cold call','Word of mouth','Other'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div className="fg">
          <label className="fl">Assign to Event</label>
          <select className="fs" value={form.cohort_id} onChange={e => set('cohort_id', e.target.value)}>
            <option value={futureCohort?.id || ''}>Future Cohort (default)</option>
            {activeCohort && <option value={activeCohort.id}>{activeCohort.name} — Active</option>}
            {cohorts.filter(c => !c.is_active && !c.is_future).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {error && <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Lead'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

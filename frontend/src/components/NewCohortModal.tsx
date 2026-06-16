import { useState } from 'react'
import api from '../api'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export default function NewCohortModal({ open, onClose, onSaved }: Props) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await api.post('/cohorts/', { name, start_date: date || null, is_active: false, is_future: false })
      setName(''); setDate('')
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hd">
          <div className="modal-title">Create New Cohort</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="fg">
          <label className="fl">Cohort Name</label>
          <input className="fi" placeholder="August 2025" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="fg">
          <label className="fl">Start Date</label>
          <input className="fi" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Creating...' : 'Create'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

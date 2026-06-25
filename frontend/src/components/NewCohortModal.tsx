import { useState, useEffect } from 'react'
import api, { getLeads, bulkAssignCohort } from '../api'

interface Lead {
  id: string; name: string; phone: string; score: number
  business_type?: string; city?: string
  cohorts?: { id: string; name: string }[]
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const avColors = ['av-g','av-b','av-o','av-p']
function av(name: string) { return avColors[name.charCodeAt(0) % 4] }
function initials(name: string) { return name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase() }
function sp(score: number) { return score>=70?'sp-h':score>=40?'sp-m':'sp-l' }

export default function NewCohortModal({ open, onClose, onSaved }: Props) {
  const [step, setStep] = useState<1|2>(1)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [newCohortId, setNewCohortId] = useState<string | null>(null)
  const [newCohortName, setNewCohortName] = useState('')

  const [leads, setLeads] = useState<Lead[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [assigning, setAssigning] = useState(false)
  const [loadingLeads, setLoadingLeads] = useState(false)

  useEffect(() => {
    if (!open) { setStep(1); setName(''); setDate(''); setSelected(new Set()); setNewCohortId(null) }
  }, [open])

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const r = await api.post('/cohorts/', { name, start_date: date || null, is_active: false, is_future: false })
      setNewCohortId(r.data.id)
      setNewCohortName(r.data.name)
      setLoadingLeads(true)
      const lr = await getLeads()
      setLeads(lr.data)
      setLoadingLeads(false)
      setStep(2)
    } finally {
      setSaving(false)
    }
  }

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === leads.length) setSelected(new Set())
    else setSelected(new Set(leads.map(l => l.id)))
  }

  const handleAssign = async () => {
    if (!newCohortId || selected.size === 0) { onSaved(); return }
    setAssigning(true)
    try {
      await bulkAssignCohort(newCohortId, Array.from(selected))
      onSaved()
    } finally {
      setAssigning(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: step === 2 ? 560 : 420, width: '100%' }}>
        <div className="modal-hd">
          <div className="modal-title">
            {step === 1 ? 'Create New Cohort' : `Add Leads → ${newCohortName}`}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {step === 1 && (
          <>
            <div className="fg">
              <label className="fl">Cohort Name</label>
              <input className="fi" placeholder="August 2025" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            </div>
            <div className="fg">
              <label className="fl">Start Date</label>
              <input className="fi" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreate} disabled={saving || !name.trim()}>
                {saving ? 'Creating...' : 'Create & Select Leads →'}
              </button>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {selected.size > 0 ? `${selected.size} lead${selected.size > 1 ? 's' : ''} selected` : 'Select leads to add to this cohort'}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={toggleAll}>
                {selected.size === leads.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {loadingLeads && <div style={{ color: 'var(--text3)', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>Loading leads...</div>}

            <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {leads.map(lead => {
                const checked = selected.has(lead.id)
                const cohortNames = lead.cohorts?.map(c => c.name).join(', ') || '—'
                return (
                  <div
                    key={lead.id}
                    onClick={() => toggle(lead.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                      borderRadius: 8, cursor: 'pointer',
                      background: checked ? 'rgba(0,212,160,0.07)' : 'var(--bg3)',
                      border: `1px solid ${checked ? 'var(--green)' : 'var(--border1)'}`,
                    }}
                  >
                    <input
                      type="checkbox" checked={checked} onChange={() => toggle(lead.id)}
                      onClick={e => e.stopPropagation()}
                      style={{ accentColor: 'var(--green)', width: 15, height: 15, flexShrink: 0 }}
                    />
                    <div className={`avatar ${av(lead.name)}`} style={{ width: 32, height: 32, fontSize: 11, flexShrink: 0 }}>{initials(lead.name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{lead.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {lead.business_type}{lead.city ? ` · ${lead.city}` : ''} · {lead.phone}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>In: {cohortNames}</div>
                    </div>
                    <div className={`score-pill ${sp(lead.score)}`} style={{ fontSize: 11 }}>{lead.score}</div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary" style={{ flex: 1 }}
                onClick={handleAssign} disabled={assigning}
              >
                {assigning ? 'Adding...' : selected.size > 0 ? `Add ${selected.size} Lead${selected.size > 1 ? 's' : ''} →` : 'Skip & Finish'}
              </button>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

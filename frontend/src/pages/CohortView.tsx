import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCohortLeads, updateStanding, trackLead } from '../api'
import type { Cohort } from '../App'

interface CohortLead {
  id: string; lead_id: string; standing: string
  last_call: string | null; next_followup: string | null; quick_note: string
  leads: {
    id: string; name: string; phone: string; score: number
    business_type?: string; city?: string; source?: string
  }
}

const avColors = ['av-g','av-b','av-o','av-p']
function av(name: string) { return avColors[name.charCodeAt(0) % 4] }
function initials(name: string) { return name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase() }
function sp(score: number) { return score>=70?'sp-h':score>=40?'sp-m':'sp-l' }

const STANDINGS = ['Confirmed','Promised','Interested','At Risk','Cold']
const standingColor: Record<string,string> = {
  Confirmed:'#00D4A0', Promised:'#F5C518', Interested:'#4F8EF7', 'At Risk':'#FF6B35', Cold:'#8B90AA'
}

function daysSince(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return '1d ago'
  return `${diff}d ago`
}
function daysSinceNum(dateStr: string | null): number {
  if (!dateStr) return 999
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}
function followupLabel(dateStr: string | null): { label: string; color: string } {
  if (!dateStr) return { label: '—', color: 'var(--text3)' }
  const diff = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000)
  if (diff < 0) return { label: `Overdue ${Math.abs(diff)}d`, color: '#FF6B35' }
  if (diff === 0) return { label: 'Today', color: '#00D4A0' }
  if (diff === 1) return { label: 'Tomorrow', color: '#F5C518' }
  return { label: new Date(dateStr).toLocaleDateString('en-IN', { day:'numeric', month:'short' }), color: 'var(--text2)' }
}

interface Props {
  cohorts: Cohort[]
  openModal: (name: 'addLead'|'logCall'|'whatsapp'|'newCohort', leadId?: string) => void
}

function NoteCell({ cohortId, leadId, initial }: { cohortId: string; leadId: string; initial: string }) {
  const [val, setVal] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const prevRef = useRef(initial)

  const save = async () => {
    if (val.trim() === prevRef.current.trim()) return
    setSaving(true)
    try {
      await trackLead(cohortId, leadId, { quick_note: val.trim() })
      prevRef.current = val.trim()
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e => e.key === 'Enter' && save()}
        placeholder="Quick note..."
        style={{
          background: 'var(--bg3)', border: '1px solid var(--border1)',
          borderRadius: 5, color: 'var(--text1)', fontSize: 11,
          padding: '4px 7px', width: '100%', outline: 'none',
          transition: 'border-color 0.15s'
        }}
        onFocus={e => e.target.style.borderColor = 'var(--green)'}
      />
      {saving && <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>...</span>}
      {saved && <span style={{ fontSize: 10, color: 'var(--green)', flexShrink: 0 }}>✓</span>}
    </div>
  )
}

function FollowupCell({ cohortId, leadId, initial }: { cohortId: string; leadId: string; initial: string | null }) {
  const [val, setVal] = useState(initial || '')
  const { label, color } = followupLabel(val || null)

  const save = async (newVal: string) => {
    setVal(newVal)
    await trackLead(cohortId, leadId, { next_followup: newVal || null })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color }}>{label}</div>
      <input
        type="date"
        value={val}
        onChange={e => save(e.target.value)}
        style={{
          background: 'var(--bg3)', border: '1px solid var(--border1)',
          borderRadius: 5, color: 'var(--text3)', fontSize: 10,
          padding: '2px 4px', cursor: 'pointer', width: 110
        }}
      />
    </div>
  )
}

export default function CohortView({ cohorts, openModal }: Props) {
  const { id } = useParams<{id:string}>()
  const navigate = useNavigate()
  const [leads, setLeads] = useState<CohortLead[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const cohort = cohorts.find(c => c.id === id)

  const load = () => {
    if (!id) return
    setLoading(true)
    getCohortLeads(id).then(r => setLeads(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])
  useEffect(() => {
    const h = () => load()
    window.addEventListener('leads-updated', h)
    return () => window.removeEventListener('leads-updated', h)
  }, [id])

  const counts: Record<string,number> = { all: leads.length }
  leads.forEach(cl => { counts[cl.standing] = (counts[cl.standing]||0)+1 })
  const filtered = filter==='all' ? leads : leads.filter(cl => cl.standing === filter)

  const handleStanding = async (e: React.ChangeEvent<HTMLSelectElement>, leadId: string) => {
    e.stopPropagation()
    if (!id) return
    const standing = e.target.value
    await updateStanding(id, leadId, standing)
    setLeads(prev => prev.map(cl => cl.lead_id===leadId ? {...cl, standing} : cl))
  }

  const confirmed = counts['Confirmed']||0
  const promised  = counts['Promised']||0
  const interested= counts['Interested']||0
  const atRisk    = counts['At Risk']||0
  const cold      = counts['Cold']||0

  const dotClass = cohort?.is_future ? 'cd-future' : cohort?.is_active ? 'cd-active' : 'cd-past'
  const metaText = cohort?.is_future
    ? 'System permanent bucket — leads without a cohort land here'
    : cohort?.is_active ? 'Active cohort' : 'Closed cohort'

  return (
    <>
      {/* Header */}
      <div className="cohort-header">
        <div className="cohort-header-top">
          <div className={`cohort-status-dot ${dotClass}`} />
          <div>
            <div className="cohort-name-lg">{cohort?.name || 'Cohort'}</div>
            <div className="cohort-meta-sm">{metaText}</div>
          </div>
          {!cohort?.is_future && (
            <div style={{marginLeft:'auto'}}>
              <button className="btn btn-primary btn-sm" onClick={() => openModal('addLead')}>+ Add Lead</button>
            </div>
          )}
        </div>
        <div className="cohort-stats">
          {cohort?.is_future ? (
            <>
              <div className="cohort-stat"><div className="cohort-stat-val">{leads.length}</div><div className="cohort-stat-label">Total</div></div>
              <div className="cohort-stat"><div className="cohort-stat-val c-yellow">{promised}</div><div className="cohort-stat-label">Promised</div></div>
              <div className="cohort-stat"><div className="cohort-stat-val c-blue">{interested}</div><div className="cohort-stat-label">Interested</div></div>
              <div className="cohort-stat"><div className="cohort-stat-val" style={{color:'var(--text3)'}}>{cold}</div><div className="cohort-stat-label">Cold</div></div>
            </>
          ) : (
            <>
              <div className="cohort-stat"><div className="cohort-stat-val c-green">{confirmed}</div><div className="cohort-stat-label">Confirmed</div></div>
              <div className="cohort-stat"><div className="cohort-stat-val c-yellow">{promised}</div><div className="cohort-stat-label">Promised</div></div>
              <div className="cohort-stat"><div className="cohort-stat-val c-blue">{interested}</div><div className="cohort-stat-label">Interested</div></div>
              <div className="cohort-stat"><div className="cohort-stat-val c-red">{atRisk}</div><div className="cohort-stat-label">At Risk</div></div>
            </>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="standing-filters">
        <div className={`sf${filter==='all'?' active':''}`} onClick={() => setFilter('all')}>All ({leads.length})</div>
        {STANDINGS.map(s => (
          <div key={s} className={`sf${filter===s?' active':''}`} onClick={() => setFilter(s)}>{s} ({counts[s]||0})</div>
        ))}
      </div>

      {loading && <div style={{color:'var(--text3)',fontSize:12,padding:'12px 0'}}>Loading...</div>}
      {!loading && filtered.length===0 && (
        <div style={{textAlign:'center',padding:'30px 0',color:'var(--text3)',fontSize:12}}>No leads in this view.</div>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg3)', borderBottom: '2px solid var(--border1)' }}>
                <th style={th}>#</th>
                <th style={{...th, textAlign:'left', minWidth:150}}>Name</th>
                <th style={{...th, textAlign:'left', minWidth:140}}>Business · City</th>
                <th style={{...th, minWidth:110}}>Phone</th>
                <th style={{...th, minWidth:60}}>Score</th>
                <th style={{...th, minWidth:90}}>Standing</th>
                <th style={{...th, minWidth:80}}>Last Call</th>
                <th style={{...th, minWidth:90}}>Days Since</th>
                <th style={{...th, minWidth:130}}>Next Follow-up</th>
                <th style={{...th, minWidth:180}}>Quick Note</th>
                <th style={{...th, minWidth:120}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cl, idx) => {
                const lead = cl.leads
                const days = daysSinceNum(cl.last_call)
                const daysColor = days===999 ? 'var(--text3)' : days>7 ? '#FF6B35' : days>3 ? '#F5C518' : '#00D4A0'

                return (
                  <tr
                    key={cl.id}
                    style={{ borderBottom: '1px solid var(--border1)', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* # */}
                    <td style={{...td, color:'var(--text3)', textAlign:'center', width:32}}>{idx+1}</td>

                    {/* Name */}
                    <td style={{...td, cursor:'pointer'}} onClick={() => navigate(`/leads/${lead.id}`)}>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <div className={`avatar ${av(lead.name)}`} style={{width:28,height:28,fontSize:10,flexShrink:0}}>{initials(lead.name)}</div>
                        <div style={{fontWeight:600, color:'var(--text1)', fontSize:12, whiteSpace:'nowrap'}}>{lead.name}</div>
                      </div>
                    </td>

                    {/* Business · City */}
                    <td style={{...td, color:'var(--text3)'}}>
                      {lead.business_type || '—'}{lead.city ? ` · ${lead.city}` : ''}
                    </td>

                    {/* Phone */}
                    <td style={{...td, color:'var(--text3)', textAlign:'center', fontFamily:'monospace', fontSize:11}}>{lead.phone}</td>

                    {/* Score */}
                    <td style={{...td, textAlign:'center'}}>
                      <span className={`score-pill ${sp(lead.score)}`} style={{fontSize:11,padding:'2px 8px'}}>{lead.score}</span>
                    </td>

                    {/* Standing */}
                    <td style={{...td, textAlign:'center'}} onClick={e => e.stopPropagation()}>
                      <select
                        value={cl.standing}
                        onChange={e => handleStanding(e, lead.id)}
                        style={{
                          background:'var(--bg2)',
                          border:`1px solid ${standingColor[cl.standing]||'var(--border2)'}`,
                          color: standingColor[cl.standing]||'var(--text2)',
                          borderRadius:5, fontSize:11, padding:'3px 6px',
                          cursor:'pointer', fontWeight:600
                        }}
                      >
                        {STANDINGS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>

                    {/* Last Call */}
                    <td style={{...td, textAlign:'center', color:'var(--text3)', fontSize:11}}>
                      {cl.last_call
                        ? new Date(cl.last_call).toLocaleDateString('en-IN',{day:'numeric',month:'short'})
                        : '—'}
                    </td>

                    {/* Days Since */}
                    <td style={{...td, textAlign:'center', fontWeight:700, color:daysColor}}>
                      {daysSince(cl.last_call)}
                    </td>

                    {/* Next Follow-up */}
                    <td style={{...td, textAlign:'center'}} onClick={e => e.stopPropagation()}>
                      {id && <FollowupCell cohortId={id} leadId={lead.id} initial={cl.next_followup} />}
                    </td>

                    {/* Quick Note */}
                    <td style={{...td, minWidth:180}} onClick={e => e.stopPropagation()}>
                      {id && <NoteCell cohortId={id} leadId={lead.id} initial={cl.quick_note || ''} />}
                    </td>

                    {/* Actions */}
                    <td style={{...td, textAlign:'center'}} onClick={e => e.stopPropagation()}>
                      <div style={{display:'flex', gap:5, justifyContent:'center'}}>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{fontSize:10, padding:'3px 8px'}}
                          onClick={() => { openModal('logCall', lead.id); navigate(`/leads/${lead.id}`) }}
                        >
                          Log Call
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{fontSize:10, padding:'3px 8px'}}
                          onClick={() => { openModal('whatsapp', lead.id); navigate(`/leads/${lead.id}`) }}
                        >
                          WA
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

const th: React.CSSProperties = {
  padding: '10px 12px', fontSize: 11, fontWeight: 600,
  color: 'var(--text3)', textAlign: 'center', whiteSpace: 'nowrap'
}
const td: React.CSSProperties = {
  padding: '8px 12px', fontSize: 12, color: 'var(--text2)'
}

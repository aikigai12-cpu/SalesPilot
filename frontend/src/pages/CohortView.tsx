import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCohortLeads, updateStanding } from '../api'
import type { Cohort } from '../App'

interface CohortLead {
  id: string; lead_id: string; standing: string
  leads: { id: string; name: string; phone: string; score: number; business_type?: string; city?: string; source?: string }
}

const avColors = ['av-g','av-b','av-o','av-p']
function av(name: string) { return avColors[name.charCodeAt(0) % 4] }
function initials(name: string) { return name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase() }
function sp(score: number) { return score>=70?'sp-h':score>=40?'sp-m':'sp-l' }

const STANDINGS = ['Confirmed','Promised','Interested','At Risk','Cold']
const standingClass: Record<string,string> = { Confirmed:'st-confirmed', Promised:'st-promised', Interested:'st-interested', 'At Risk':'st-atrisk', Cold:'st-cold' }

interface Props {
  cohorts: Cohort[]
  openModal: (name: 'addLead'|'logCall'|'whatsapp'|'newCohort', leadId?: string) => void
}

export default function CohortView({ cohorts, openModal }: Props) {
  const { id } = useParams<{id:string}>()
  const navigate = useNavigate()
  const [leads, setLeads] = useState<CohortLead[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const cohort = cohorts.find(c => c.id === id)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getCohortLeads(id).then(r => setLeads(r.data)).finally(() => setLoading(false))
  }, [id])

  const counts: Record<string,number> = { all: leads.length }
  leads.forEach(cl => { counts[cl.standing] = (counts[cl.standing]||0)+1 })

  const filtered = filter==='all' ? leads : leads.filter(cl=>cl.standing===filter)

  const handleStanding = async (leadId: string, standing: string) => {
    if (!id) return
    await updateStanding(id, leadId, standing)
    setLeads(prev => prev.map(cl => cl.lead_id===leadId ? {...cl, standing} : cl))
  }

  const confirmed = counts['Confirmed']||0
  const promised = counts['Promised']||0
  const interested = counts['Interested']||0
  const atRisk = counts['At Risk']||0
  const cold = counts['Cold']||0

  const dotClass = cohort?.is_future ? 'cd-future' : cohort?.is_active ? 'cd-active' : 'cd-past'
  const metaText = cohort?.is_future ? 'System permanent bucket — leads without a cohort land here' : cohort?.is_active ? 'Active cohort' : 'Closed cohort'

  return (
    <>
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

      {cohort?.is_active && (
        <div className="ai-box">
          <div className="ai-box-title">AI Prediction — {cohort.name}</div>
          <p>Focus this week on <strong>Promised ({promised})</strong> leads — they're closest to converting. At Risk leads ({atRisk}) need contact urgently.</p>
        </div>
      )}
      {cohort?.is_future && (
        <div className="ai-box">
          <div className="ai-box-title">AI Intelligence — Future Cohort</div>
          <p><strong>{leads.length} leads</strong> in this bucket. <strong>{promised} Promised</strong> leads should be contacted when next cohort opens. Leads are ranked by score.</p>
        </div>
      )}

      <div className="standing-filters">
        <div className={`sf${filter==='all'?' active':''}`} onClick={() => setFilter('all')}>All ({leads.length})</div>
        {STANDINGS.map(s => (
          <div key={s} className={`sf${filter===s?' active':''}`} onClick={() => setFilter(s)}>{s} ({counts[s]||0})</div>
        ))}
      </div>

      {loading && <div style={{color:'var(--text3)',fontSize:12}}>Loading...</div>}

      {!loading && filtered.length===0 && (
        <div style={{textAlign:'center',padding:'30px 0',color:'var(--text3)',fontSize:12}}>No leads in this view.</div>
      )}

      {filtered.map(cl => {
        const lead = cl.leads
        return (
          <div key={cl.id} className="lead-card" onClick={() => navigate(`/leads/${lead.id}`)}>
            <div className="lead-row">
              <div className={`avatar ${av(lead.name)}`}>{initials(lead.name)}</div>
              <div className="lead-info">
                <div className="lead-name">{lead.name}</div>
                <div className="lead-biz">{lead.business_type}{lead.city?` · ${lead.city}`:''}</div>
              </div>
              <div className={`standing-chip ${standingClass[cl.standing]||'st-interested'}`} style={{marginRight:8}}>{cl.standing}</div>
              <div className={`score-pill ${sp(lead.score)}`}>{lead.score}</div>
            </div>
            <div className="lead-foot" style={{marginTop:8}}>
              <div className="lead-meta">{lead.phone}</div>
              <select
                className="fs"
                style={{fontSize:11,padding:'3px 8px',width:'auto'}}
                value={cl.standing}
                onClick={e => e.stopPropagation()}
                onChange={e => { e.stopPropagation(); handleStanding(lead.id, e.target.value) }}
              >
                {STANDINGS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )
      })}
    </>
  )
}

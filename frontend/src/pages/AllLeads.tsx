import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLeads, getCohorts, assignCohort } from '../api'

interface LeadCohort { id: string; name: string }

interface Lead {
  id: string; name: string; phone: string; score: number
  business_type?: string; city?: string; source?: string
  ai_recommendation?: string
  cohorts?: LeadCohort[]
}

interface Cohort { id: string; name: string; is_future: boolean; is_active: boolean }

const avColors = ['av-g','av-b','av-o','av-p']
function av(name: string) { return avColors[name.charCodeAt(0) % 4] }
function initials(name: string) { return name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase() }
function sp(score: number) { return score>=70?'sp-h':score>=40?'sp-m':'sp-l' }

interface Props { openModal: (name: 'addLead'|'logCall'|'whatsapp'|'newCohort', leadId?: string) => void }

export default function AllLeads({ openModal }: Props) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<string | null>(null)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    const params: Record<string,string> = {}
    if (search) params.search = search
    if (filter !== 'all') params.score_band = filter
    getLeads(params).then(r => setLeads(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [search, filter])
  useEffect(() => { getCohorts().then(r => setCohorts(r.data)).catch(() => {}) }, [])
  useEffect(() => {
    const h = () => load()
    window.addEventListener('leads-updated', h)
    return () => window.removeEventListener('leads-updated', h)
  }, [search, filter])

  const handleAssignCohort = async (e: React.ChangeEvent<HTMLSelectElement>, lead: Lead) => {
    e.stopPropagation()
    const cohortId = e.target.value
    if (!cohortId) return
    setAssigning(lead.id)
    try {
      await assignCohort(cohortId, lead.id)
      load()
    } finally {
      setAssigning(null)
    }
  }

  const filters = [
    { key: 'all', label: `All (${leads.length})` },
    { key: 'hot', label: 'Hot 70+' },
    { key: 'medium', label: 'Medium' },
    { key: 'cold', label: 'Cold' },
  ]

  const realCohorts = cohorts.filter(c => !c.is_future)

  return (
    <>
      <div className="search-row">
        <input
          className="search-input"
          placeholder="Search by name, city, business..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" onClick={() => openModal('addLead')}>+ Add Lead</button>
      </div>

      <div className="filter-row">
        {filters.map(f => (
          <div key={f.key} className={`fc${filter===f.key?' active':''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </div>
        ))}
      </div>

      {loading && <div style={{color:'var(--text3)',fontSize:12}}>Loading...</div>}

      {!loading && leads.length === 0 && (
        <div style={{textAlign:'center',padding:'40px 0',color:'var(--text3)'}}>
          <div style={{fontSize:32,marginBottom:10}}>📋</div>
          <div style={{fontSize:13}}>No leads found. <span style={{color:'var(--green)',cursor:'pointer'}} onClick={() => openModal('addLead')}>Add your first lead</span></div>
        </div>
      )}

      {leads.map(lead => {
        const leadCohortIds = new Set((lead.cohorts || []).map(c => c.id))
        const cohortLabel = lead.cohorts && lead.cohorts.length > 0
          ? lead.cohorts.map(c => c.name).join(', ')
          : 'Not assigned'

        return (
          <div key={lead.id} className="lead-card" onClick={() => navigate(`/leads/${lead.id}`)}>
            <div className="lead-row">
              <div className={`avatar ${av(lead.name)}`}>{initials(lead.name)}</div>
              <div className="lead-info">
                <div className="lead-name">{lead.name}</div>
                <div className="lead-biz">
                  {lead.business_type}{lead.city ? ` · ${lead.city}` : ''}{lead.source ? ` · ${lead.source}` : ''}
                </div>
              </div>
              <div className={`score-pill ${sp(lead.score)}`}>{lead.score}</div>
            </div>
            {lead.ai_recommendation && (
              <div className={`ai-line${lead.score < 40 ? ' warn' : ''}`} style={{marginTop:8}}>
                <strong>AI:</strong> {lead.ai_recommendation}
              </div>
            )}
            <div className="lead-foot" style={{marginTop:6}}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                <div className="lead-meta" style={{ fontSize: 10, color: 'var(--text3)' }}>📁 {cohortLabel}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                <select
                  style={{
                    background: 'var(--bg3)', border: '1px solid var(--border2)',
                    color: 'var(--green)', borderRadius: 6, fontSize: 11,
                    padding: '3px 6px', cursor: 'pointer'
                  }}
                  value=""
                  disabled={assigning === lead.id}
                  onChange={e => handleAssignCohort(e, lead)}
                >
                  <option value="" disabled>{assigning === lead.id ? 'Adding...' : '+ Add to Cohort'}</option>
                  {realCohorts
                    .filter(c => !leadCohortIds.has(c.id))
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  }
                  {realCohorts.filter(c => !leadCohortIds.has(c.id)).length === 0 && (
                    <option disabled>In all cohorts</option>
                  )}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={() => { openModal('logCall', lead.id); navigate(`/leads/${lead.id}`) }}>
                  Log Call
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </>
  )
}

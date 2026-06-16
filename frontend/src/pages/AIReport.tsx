import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLeads } from '../api'

interface Lead {
  id: string; name: string; phone: string; score: number
  business_type?: string; city?: string; source?: string
  ai_recommendation?: string; score_reason?: string
}

const avColors = ['av-g','av-b','av-o','av-p']
function av(name: string) { return avColors[name.charCodeAt(0) % 4] }
function initials(name: string) { return name.split(' ').map((w:string)=>w[0]).join('').substring(0,2).toUpperCase() }
function sp(score: number) { return score>=70?'sp-h':score>=40?'sp-m':'sp-l' }
function scoreColor(score: number) { return score>=70?'var(--green)':score>=40?'var(--yellow)':'var(--red)' }

export default function AIReport() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getLeads().then(r => {
      setLeads([...r.data].sort((a: Lead, b: Lead) => b.score - a.score))
    }).finally(() => setLoading(false))
  }, [])

  const hot = leads.filter(l => l.score >= 70)
  const medium = leads.filter(l => l.score >= 40 && l.score < 70)
  const cold = leads.filter(l => l.score < 40)

  const avg = leads.length ? Math.round(leads.reduce((s,l)=>s+l.score,0)/leads.length) : 0

  return (
    <>
      <div className="sec" style={{marginBottom:16}}>
        <div className="sec-title">AI Pre-Cohort Report</div>
        <div style={{fontSize:11,color:'var(--text3)'}}>All leads ranked by AI score</div>
      </div>

      <div className="stat-grid" style={{marginBottom:16}}>
        <div className="stat-card">
          <div className="stat-label">Total Leads</div>
          <div className="stat-val">{leads.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Hot (70+)</div>
          <div className="stat-val c-green">{hot.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Medium</div>
          <div className="stat-val c-orange">{medium.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Score</div>
          <div className="stat-val" style={{color:scoreColor(avg)}}>{avg}</div>
        </div>
      </div>

      <div className="ai-box" style={{marginBottom:16}}>
        <div className="ai-box-title">🤖 AI Recommendation</div>
        <p>Focus all energy on <strong>{hot.length} Hot leads</strong> this week — highest conversion probability. {medium.length > 0 && `Nurture ${medium.length} Medium leads with WhatsApp follow-ups.`} {cold.length > 0 && `${cold.length} Cold leads are low priority — minimal time.`}</p>
      </div>

      {loading && <div style={{color:'var(--text3)',fontSize:12}}>Loading...</div>}

      {hot.length > 0 && (
        <>
          <div className="sec" style={{marginBottom:8}}>
            <div className="sec-title" style={{color:'var(--green)'}}>🔥 Hot — Close Now ({hot.length})</div>
          </div>
          {hot.map(lead => (
            <div key={lead.id} className="lead-card" onClick={() => navigate(`/leads/${lead.id}`)}>
              <div className="lead-row">
                <div className={`avatar ${av(lead.name)}`}>{initials(lead.name)}</div>
                <div className="lead-info">
                  <div className="lead-name">{lead.name}</div>
                  <div className="lead-biz">{lead.business_type}{lead.city?` · ${lead.city}`:''}</div>
                </div>
                <div className={`score-pill ${sp(lead.score)}`}>{lead.score}</div>
              </div>
              {lead.ai_recommendation && (
                <div className="ai-line" style={{marginTop:8}}><strong>AI:</strong> {lead.ai_recommendation}</div>
              )}
            </div>
          ))}
        </>
      )}

      {medium.length > 0 && (
        <>
          <div className="sec" style={{marginTop:16,marginBottom:8}}>
            <div className="sec-title" style={{color:'var(--orange)'}}>⚡ Medium — Nurture ({medium.length})</div>
          </div>
          {medium.map(lead => (
            <div key={lead.id} className="lead-card" onClick={() => navigate(`/leads/${lead.id}`)}>
              <div className="lead-row">
                <div className={`avatar ${av(lead.name)}`}>{initials(lead.name)}</div>
                <div className="lead-info">
                  <div className="lead-name">{lead.name}</div>
                  <div className="lead-biz">{lead.business_type}{lead.city?` · ${lead.city}`:''}</div>
                </div>
                <div className={`score-pill ${sp(lead.score)}`}>{lead.score}</div>
              </div>
              {lead.ai_recommendation && (
                <div className="ai-line" style={{marginTop:8}}><strong>AI:</strong> {lead.ai_recommendation}</div>
              )}
            </div>
          ))}
        </>
      )}

      {cold.length > 0 && (
        <>
          <div className="sec" style={{marginTop:16,marginBottom:8}}>
            <div className="sec-title" style={{color:'var(--red)'}}>❄️ Cold — Low Priority ({cold.length})</div>
          </div>
          {cold.map(lead => (
            <div key={lead.id} className="lead-card" style={{opacity:0.7}} onClick={() => navigate(`/leads/${lead.id}`)}>
              <div className="lead-row">
                <div className={`avatar ${av(lead.name)}`}>{initials(lead.name)}</div>
                <div className="lead-info">
                  <div className="lead-name">{lead.name}</div>
                  <div className="lead-biz">{lead.business_type}{lead.city?` · ${lead.city}`:''}</div>
                </div>
                <div className={`score-pill ${sp(lead.score)}`}>{lead.score}</div>
              </div>
              {lead.ai_recommendation && (
                <div className="ai-line warn" style={{marginTop:8}}><strong>AI:</strong> {lead.ai_recommendation}</div>
              )}
            </div>
          ))}
        </>
      )}
    </>
  )
}

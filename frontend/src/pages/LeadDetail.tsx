import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLead, getCallLogs, getWhatsappLogs, addCallLog, parseWhatsapp } from '../api'

interface Lead {
  id: string; name: string; phone: string; whatsapp?: string
  business_type?: string; city?: string; source?: string; team_size?: string; revenue_range?: string
  score: number; score_reason?: string; ai_recommendation?: string
}
interface CallLog {
  id: string; date: string; duration_min: number; outcome: string
  objection?: string; interest_rating: number; followup_date?: string; notes?: string
}
interface WALog {
  id: string; date: string; ai_sentiment?: string; ai_objection?: string
  ai_cohort_promise?: string; ai_summary?: string; raw_text?: string
}

const avColors = ['av-g','av-b','av-o','av-p']
function av(name: string) { return avColors[name.charCodeAt(0) % 4] }
function initials(name: string) { return name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase() }
function sp(score: number) { return score>=70?'sp-h':score>=40?'sp-m':'sp-l' }
function scoreColor(score: number) { return score>=70?'var(--green)':score>=40?'var(--yellow)':'var(--red)' }

interface Props { openModal: (name: 'addLead'|'logCall'|'whatsapp'|'newCohort', leadId?: string) => void }

type Tab = 'timeline'|'call'|'whatsapp'

export default function LeadDetail({ openModal }: Props) {
  const { id } = useParams<{id:string}>()
  const navigate = useNavigate()
  const [lead, setLead] = useState<Lead | null>(null)
  const [calls, setCalls] = useState<CallLog[]>([])
  const [waLogs, setWaLogs] = useState<WALog[]>([])
  const [tab, setTab] = useState<Tab>('timeline')
  const [loading, setLoading] = useState(true)

  const [callForm, setCallForm] = useState({ date: new Date().toISOString().split('T')[0], duration_min: '', outcome: 'Connected', objection: '', interest_rating: 3, followup_date: '', notes: '' })
  const [savingCall, setSavingCall] = useState(false)
  const [waText, setWaText] = useState('')
  const [parsingWa, setParsingWa] = useState(false)
  const [waResult, setWaResult] = useState<WALog | null>(null)
  const [logRating, setLogRating] = useState(3)

  const reload = () => {
    if (!id) return
    Promise.all([getLead(id), getCallLogs(id), getWhatsappLogs(id)]).then(([l,c,w]) => {
      setLead(l.data); setCalls(c.data); setWaLogs(w.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [id])
  useEffect(() => {
    const h = () => reload()
    window.addEventListener('leads-updated', h)
    return () => window.removeEventListener('leads-updated', h)
  }, [id])

  const handleCall = async () => {
    if (!id) return
    setSavingCall(true)
    await addCallLog(id, { ...callForm, duration_min: Number(callForm.duration_min)||0, interest_rating: logRating })
    setSavingCall(false)
    setCallForm({ date: new Date().toISOString().split('T')[0], duration_min: '', outcome: 'Connected', objection: '', interest_rating: 3, followup_date: '', notes: '' })
    setLogRating(3)
    reload()
  }

  const handleWA = async () => {
    if (!id || !waText.trim()) return
    setParsingWa(true)
    try {
      const r = await parseWhatsapp(id, waText)
      setWaResult(r.data)
      setWaText('')
      reload()
    } finally { setParsingWa(false) }
  }

  if (loading) return <div style={{color:'var(--text3)',padding:20}}>Loading...</div>
  if (!lead) return <div style={{color:'var(--text3)',padding:20}}>Lead not found.</div>

  const sc = lead.score >= 70 ? '' : 'sc-m'
  const allInteractions = [
    ...calls.map(c => ({ type:'call', date: c.date, label:`Call · ${c.outcome} · Rating ${c.interest_rating}/5`, note: c.notes||'', dot: c.outcome.includes('not') || c.outcome.includes('Not') ? 'o' : '' })),
    ...waLogs.map(w => ({ type:'wa', date: w.date, label:'WhatsApp chat', note: w.ai_summary||w.raw_text||'', dot:'b' }))
  ].sort((a,b) => b.date.localeCompare(a.date))

  return (
    <div className="detail-overlay open" style={{display:'flex'}}>
      <div className="detail-topbar">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
        <div style={{fontSize:13,fontWeight:700}}>{lead.name}</div>
        <div style={{marginLeft:'auto',display:'flex',gap:7}}>
          <button className="btn btn-ghost btn-sm" onClick={() => openModal('whatsapp', id)}>+ WhatsApp</button>
          <button className="btn btn-primary btn-sm" onClick={() => setTab('call')}>+ Log Call</button>
        </div>
      </div>

      <div className="detail-body-wrap">
        <div className="detail-grid">
          {/* LEFT */}
          <div>
            <div className="prosp-header">
              <div className={`score-circle ${sc}`} style={{borderColor: scoreColor(lead.score)}}>
                <div className="sc-num" style={{color: scoreColor(lead.score)}}>{lead.score}</div>
                <div className="sc-label">AI SCORE</div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:700}}>{lead.name}</div>
                <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>{lead.business_type}{lead.city?` · ${lead.city}`:''}{lead.source?` · ${lead.source}`:''}</div>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{lead.phone}</div>
              </div>
            </div>

            {lead.ai_recommendation && (
              <div className="ai-box" style={{marginBottom:10}}>
                <div className="ai-box-title">🤖 AI Recommendation</div>
                <p>{lead.ai_recommendation}</p>
              </div>
            )}

            {/* Tabs */}
            <div className="tl-tabs">
              {(['timeline','call','whatsapp'] as Tab[]).map(t => (
                <div key={t} className={`tl-tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
                  {t==='timeline'?`Timeline (${allInteractions.length})`:t==='call'?'Log Call':'Add WhatsApp'}
                </div>
              ))}
            </div>

            {/* Timeline */}
            {tab==='timeline' && (
              allInteractions.length === 0
                ? <div style={{fontSize:12,color:'var(--text3)'}}>No interactions yet. Log a call or add a WhatsApp chat.</div>
                : <div className="timeline">
                    {allInteractions.map((i,idx) => (
                      <div key={idx} className="tl-item">
                        <div className={`tl-dot ${i.dot}`} />
                        <div className="tl-date">{i.date}</div>
                        <div className="tl-box">
                          <div className="tl-type">{i.label}</div>
                          {i.note && <div className="tl-note">{i.note}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
            )}

            {/* Log Call */}
            {tab==='call' && (
              <div style={{background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:9,padding:12}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:10}}>Log New Call — AI will recalculate score</div>
                <div className="form-row" style={{marginBottom:8}}>
                  <div>
                    <label className="fl">Date</label>
                    <input className="fi" type="date" value={callForm.date} onChange={e => setCallForm(p=>({...p,date:e.target.value}))} />
                  </div>
                  <div>
                    <label className="fl">Duration (min)</label>
                    <input className="fi" type="number" placeholder="10" value={callForm.duration_min} onChange={e => setCallForm(p=>({...p,duration_min:e.target.value}))} />
                  </div>
                </div>
                <div className="form-row" style={{marginBottom:8}}>
                  <div>
                    <label className="fl">Outcome</label>
                    <select className="fs" value={callForm.outcome} onChange={e => setCallForm(p=>({...p,outcome:e.target.value}))}>
                      <option>Connected</option>
                      <option>Answered — good conversation</option>
                      <option>Answered — short call</option>
                      <option>Not answered</option>
                      <option>Said will join cohort</option>
                      <option>Not Interested</option>
                    </select>
                  </div>
                  <div>
                    <label className="fl">Objection</label>
                    <select className="fs" value={callForm.objection} onChange={e => setCallForm(p=>({...p,objection:e.target.value}))}>
                      <option value="">None</option>
                      <option value="price">Price too high</option>
                      <option value="time">No time</option>
                      <option value="partner_decision">Partner decision</option>
                      <option value="not_sure">Not sure</option>
                      <option value="not_interested">Not interested</option>
                    </select>
                  </div>
                </div>
                <div style={{marginBottom:8}}>
                  <label className="fl">Interest Rating</label>
                  <div className="rb-row">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} className={`rb${logRating===n?' active':''}`} onClick={() => setLogRating(n)}>{n}</button>
                    ))}
                  </div>
                </div>
                <div style={{marginBottom:8}}>
                  <label className="fl">Next Follow-up Date</label>
                  <input className="fi" type="date" value={callForm.followup_date} onChange={e => setCallForm(p=>({...p,followup_date:e.target.value}))} />
                </div>
                <div style={{marginBottom:8}}>
                  <label className="fl">Notes</label>
                  <textarea className="ft" style={{minHeight:60}} placeholder="What happened..." value={callForm.notes} onChange={e => setCallForm(p=>({...p,notes:e.target.value}))} />
                </div>
                <button className="btn btn-primary" style={{width:'100%'}} onClick={handleCall} disabled={savingCall}>
                  {savingCall ? 'Saving & Scoring...' : 'Save — Let AI Recalculate Score →'}
                </button>
              </div>
            )}

            {/* WhatsApp */}
            {tab==='whatsapp' && (
              <div style={{background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:9,padding:12}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8}}>Add WhatsApp Chat</div>
                <div className="ai-box" style={{marginBottom:10}}>
                  <div className="ai-box-title">AI will extract from this:</div>
                  <p>Sentiment · Cohort promise · Objection · Follow-up needed · Score updated automatically</p>
                </div>
                <div style={{marginBottom:8}}>
                  <label className="fl">Paste WhatsApp chat</label>
                  <textarea className="ft" style={{minHeight:90}} placeholder={"Rajesh: July pakka bhai. Price thodi zyada hai but serious hoon..."} value={waText} onChange={e => setWaText(e.target.value)} />
                </div>
                <button className="btn btn-primary" style={{width:'100%'}} onClick={handleWA} disabled={parsingWa || !waText.trim()}>
                  {parsingWa ? '🤖 AI Analysing...' : 'Analyse & Save'}
                </button>
                {waResult && (
                  <div style={{marginTop:10,background:'var(--bg4)',borderRadius:8,padding:10,fontSize:12}}>
                    <div style={{fontWeight:700,color:'var(--green)',marginBottom:6,fontSize:11}}>✅ AI Analysis Complete</div>
                    {waResult.ai_sentiment && <div style={{marginBottom:4}}><span style={{color:'var(--text3)'}}>Sentiment: </span><span>{waResult.ai_sentiment}</span></div>}
                    {waResult.ai_objection && <div style={{marginBottom:4}}><span style={{color:'var(--text3)'}}>Objection: </span><span style={{color:'var(--orange)'}}>{waResult.ai_objection}</span></div>}
                    {waResult.ai_cohort_promise && <div style={{marginBottom:4}}><span style={{color:'var(--text3)'}}>Cohort Promise: </span><span style={{color:'var(--green)'}}>{waResult.ai_cohort_promise}</span></div>}
                    {waResult.ai_summary && <div style={{color:'var(--text2)',marginTop:4}}>{waResult.ai_summary}</div>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div>
            <div className="prosp-factors" style={{marginBottom:8}}>
              <div className="prosp-factor-title">Prospective Score Breakdown</div>
              {[
                { label:'Call response rate', pct: Math.min((calls.filter(c=>c.outcome!=='Not answered').length/(calls.length||1))*100,100), color: calls.length>0?'var(--green)':'var(--text3)', val: calls.length>0?'Active':'No calls yet' },
                { label:'WhatsApp engagement', pct: Math.min(waLogs.length*30,100), color: waLogs.length>0?'var(--green)':'var(--text3)', val: waLogs.length>0?'Active':'None yet' },
                { label:'Objection severity', pct: calls.some(c=>c.objection==='not_interested')?20:calls.some(c=>c.objection&&c.objection!=='')?50:85, color: calls.some(c=>c.objection==='not_interested')?'var(--red)':calls.some(c=>c.objection&&c.objection!=='')?'var(--yellow)':'var(--green)', val: calls.some(c=>c.objection==='not_interested')?'High':calls.some(c=>c.objection&&c.objection!=='')?'Medium':'Low' },
                { label:'Prospect fit', pct: 70, color:'var(--green)', val:'Medium' },
              ].map(f => (
                <div key={f.label}>
                  <div className="prosp-factor">
                    <span className="prosp-factor-label">{f.label}</span>
                    <span className="prosp-factor-val" style={{color:f.color}}>{f.val}</span>
                  </div>
                  <div className="prog-bar">
                    <div className="prog-fill" style={{width:`${f.pct}%`,background:f.color}} />
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{marginBottom:8}}>
              <div className="card-title">Profile</div>
              {[['Phone',lead.phone],['WhatsApp',lead.whatsapp],['Business',lead.business_type],['City',lead.city],['Team Size',lead.team_size],['Revenue',lead.revenue_range],['Source',lead.source]].filter(([,v])=>v).map(([k,v])=>(
                <div key={k as string} style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:5}}>
                  <span style={{color:'var(--text3)'}}>{k}</span>
                  <span style={{color:'var(--text)'}}>{v}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-title">Quick Actions</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <button className="btn btn-primary" onClick={() => setTab('call')}>+ Log Call</button>
                <button className="btn btn-ghost" onClick={() => setTab('whatsapp')}>+ WhatsApp Chat</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

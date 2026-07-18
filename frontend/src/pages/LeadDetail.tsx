import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLead, getCallLogs, getWhatsappLogs, addCallLog, parseWhatsapp } from '../api'
import GreenfieldPanel from '../components/GreenfieldPanel'

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

const avColors = ['#2563eb','#16a34a','#ea580c','#9333ea']
function avColor(name: string) { return avColors[name.charCodeAt(0) % 4] }
function initials(name: string) { return name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase() }
function scoreColor(score: number) { return score>=70?'var(--green)':score>=40?'var(--yellow)':'var(--red)' }

interface Props { openModal: (name: 'addLead'|'logCall'|'whatsapp'|'newCohort', leadId?: string) => void }

type Tab = 'timeline'|'call'|'whatsapp'|'profile'

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
  const [activityOpen, setActivityOpen] = useState(false)

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

  const openLogCall = () => { setActivityOpen(true); setTab('call') }
  const openLogWhatsApp = () => { setActivityOpen(true); setTab('whatsapp') }

  if (loading) return <div style={{color:'var(--text3)',padding:20}}>Loading...</div>
  if (!lead) return <div style={{color:'var(--text3)',padding:20}}>Lead not found.</div>

  const realSignals = (calls.length > 0 ? 1 : 0) + (waLogs.length > 0 ? 1 : 0)
  const confidence = realSignals >= 3 ? 'High' : realSignals >= 2 ? 'Medium' : 'Low'
  const confidenceColor = confidence === 'High' ? 'var(--green)' : confidence === 'Medium' ? 'var(--yellow)' : 'var(--red)'

  const allInteractions = [
    ...calls.map(c => ({ type:'call', date: c.date, label:`Call · ${c.outcome} · Rating ${c.interest_rating}/5`, note: c.notes||'', dot: c.outcome.includes('not') || c.outcome.includes('Not') ? 'o' : '' })),
    ...waLogs.map(w => ({ type:'wa', date: w.date, label:'WhatsApp chat', note: w.ai_summary||w.raw_text||'', dot:'b' }))
  ].sort((a,b) => b.date.localeCompare(a.date))

  return (
    <div className="detail-overlay open" style={{display:'flex'}}>
      <div className="detail-topbar">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
        <div style={{fontSize:13,fontWeight:700,color:'var(--text2)'}}>{lead.name}</div>
      </div>

      <div className="detail-body-wrap">
        <div style={{maxWidth:640,margin:'0 auto',paddingBottom:40}}>

          {/* LEAD HEADER */}
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
            <div style={{
              width:48,height:48,borderRadius:'50%',flexShrink:0,
              background:avColor(lead.name),
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:16,fontWeight:700,color:'#fff'
            }}>
              {initials(lead.name)}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:3}}>{lead.name}</div>
              <div style={{fontSize:12,color:'var(--text3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                {[lead.business_type,lead.city,lead.team_size?`Team ${lead.team_size}`:null,lead.revenue_range].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:5,flexShrink:0,alignItems:'flex-end'}}>
              <div style={{background:'var(--bg3)',border:`1px solid ${scoreColor(lead.score)}`,borderRadius:20,padding:'3px 12px',fontSize:12,fontWeight:700,color:scoreColor(lead.score)}}>
                Score {lead.score}
              </div>
              <div style={{background:'var(--bg3)',border:`1px solid ${confidenceColor}`,borderRadius:20,padding:'3px 12px',fontSize:11,fontWeight:600,color:confidenceColor}}>
                {confidence} confidence
              </div>
            </div>
          </div>

          {lead.ai_recommendation && (
            <div className="ai-box" style={{marginBottom:14}}>
              <div className="ai-box-title">🤖 AI Recommendation</div>
              <p>{lead.ai_recommendation}</p>
            </div>
          )}

          {/* GREENFIELD PANEL — main content */}
          <GreenfieldPanel
            leadId={id!}
            score={lead.score}
            calls={calls}
            waLogs={waLogs}
            onLogCall={openLogCall}
            onLogWhatsApp={openLogWhatsApp}
          />

          {/* ACTIVITY SECTION — collapsible */}
          <div style={{marginTop:20,border:'1px solid var(--border2)',borderRadius:10,overflow:'hidden'}}>
            <button
              onClick={() => setActivityOpen(p=>!p)}
              style={{width:'100%',background:'var(--bg3)',border:'none',padding:'13px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',fontSize:13,fontWeight:600,color:'var(--text2)'}}
            >
              <span>Activity & Profile {allInteractions.length > 0 ? `(${allInteractions.length} interactions)` : ''}</span>
              <span style={{fontSize:11}}>{activityOpen?'▲':'▼'}</span>
            </button>

            {activityOpen && (
              <div style={{padding:'0 0 0 0'}}>
                <div style={{display:'flex',borderBottom:'1px solid var(--border2)'}}>
                  {(['timeline','call','whatsapp','profile'] as Tab[]).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                      flex:1,padding:'10px 0',border:'none',background:'none',
                      fontSize:11,fontWeight:600,cursor:'pointer',
                      color:tab===t?'var(--accent)':'var(--text3)',
                      borderBottom:tab===t?'2px solid var(--accent)':'2px solid transparent',
                    }}>
                      {t==='timeline'?'Timeline':t==='call'?'Log Call':t==='whatsapp'?'WhatsApp':'Profile'}
                    </button>
                  ))}
                </div>

                <div style={{padding:'14px 16px'}}>

                  {/* Timeline */}
                  {tab==='timeline' && (
                    allInteractions.length === 0
                      ? <div style={{fontSize:12,color:'var(--text3)'}}>No interactions yet.</div>
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
                    <div>
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
                    <div>
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
                          {waResult.ai_sentiment && <div style={{marginBottom:4}}><span style={{color:'var(--text3)'}}>Sentiment: </span>{waResult.ai_sentiment}</div>}
                          {waResult.ai_objection && <div style={{marginBottom:4}}><span style={{color:'var(--text3)'}}>Objection: </span><span style={{color:'var(--orange)'}}>{waResult.ai_objection}</span></div>}
                          {waResult.ai_cohort_promise && <div style={{marginBottom:4}}><span style={{color:'var(--text3)'}}>Cohort Promise: </span><span style={{color:'var(--green)'}}>{waResult.ai_cohort_promise}</span></div>}
                          {waResult.ai_summary && <div style={{color:'var(--text2)',marginTop:4}}>{waResult.ai_summary}</div>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Profile */}
                  {tab==='profile' && (
                    <div>
                      {[['Phone',lead.phone],['WhatsApp',lead.whatsapp],['Business',lead.business_type],['City',lead.city],['Team Size',lead.team_size],['Revenue',lead.revenue_range],['Source',lead.source]].filter(([,v])=>v).map(([k,v])=>(
                        <div key={k as string} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:8,paddingBottom:8,borderBottom:'1px solid var(--border1)'}}>
                          <span style={{color:'var(--text3)'}}>{k}</span>
                          <span style={{color:'var(--text)',fontWeight:500}}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { getQuickAnalysis, getFullResearch } from '../api'

interface Props {
  leadId: string
  score: number
  calls: { objection?: string }[]
  waLogs: unknown[]
}

const ALL_STAGES = [
  { id: 'stage_0',  label: 'Stage 0 — Confirm identity' },
  { id: 'stage_05', label: 'Stage 0.5 — Trigger radar' },
  { id: 'stage_1',  label: 'Stage 1 — LinkedIn warm path' },
  { id: 'stage_4',  label: 'Stage 4 — Website analysis' },
  { id: 'stage_5',  label: 'Stage 5 — Hiring signals' },
  { id: 'stage_7',  label: 'Stage 7 — Leadership deep dive' },
  { id: 'stage_55', label: 'Stage 5.5 — Earned right test' },
  { id: 'stage_9',  label: 'Stage 9 — Objection prediction' },
  { id: 'stage_11', label: 'Stage 11 — Opening message' },
]

type Mode = 'quick' | 'full'

export default function GreenfieldPanel({ leadId, score, calls, waLogs }: Props) {
  const [mode, setMode] = useState<Mode>('quick')
  const [loading, setLoading] = useState(false)
  const [quickResult, setQuickResult] = useState<Record<string, unknown> | null>(null)
  const [fullResult, setFullResult] = useState<Record<string, unknown> | null>(null)
  const [selectedStages, setSelectedStages] = useState<string[]>(ALL_STAGES.map(s => s.id))
  const [website, setWebsite] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [instagram, setInstagram] = useState('')
  const [mutual, setMutual] = useState('')
  const [runningStages, setRunningStages] = useState<string[]>([])

  const realSignals = (calls.length > 0 ? 1 : 0) + (waLogs.length > 0 ? 1 : 0)
  const totalSignals = 4
  const confidence = realSignals >= 3 ? 'High' : realSignals >= 2 ? 'Medium' : 'Low'
  const confidenceColor = confidence === 'High' ? 'var(--green)' : confidence === 'Medium' ? 'var(--yellow)' : 'var(--red)'

  const toggleStage = (id: string) => {
    setSelectedStages(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const runQuick = async () => {
    setLoading(true)
    setQuickResult(null)
    try {
      const r = await getQuickAnalysis(leadId)
      setQuickResult(r.data)
    } finally {
      setLoading(false)
    }
  }

  const runFull = async () => {
    setLoading(true)
    setFullResult(null)
    setRunningStages([])
    // animate stages
    for (const s of selectedStages) {
      await new Promise(r => setTimeout(r, 350))
      setRunningStages(prev => [...prev, s])
    }
    try {
      const r = await getFullResearch(leadId, {
        website, linkedin, instagram, mutual_contact: mutual, stages: selectedStages
      })
      setFullResult(r.data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button
          className={`btn btn-sm ${mode === 'quick' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: 1 }}
          onClick={() => setMode('quick')}
        >
          ⚡ Quick analysis
        </button>
        <button
          className={`btn btn-sm ${mode === 'full' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: 1 }}
          onClick={() => setMode('full')}
        >
          🔭 Full research
        </button>
      </div>

      {/* QUICK MODE */}
      {mode === 'quick' && (
        <div>
          {/* Score confidence */}
          <div className="ai-box" style={{ marginBottom: 10 }}>
            <div className="ai-box-title">Score confidence</div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 6 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{score}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>Score</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: confidenceColor }}>{confidence}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>Confidence</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{realSignals}/{totalSignals}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>Real signals</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>
              Score is partly based on profile assumptions. Only {realSignals} of {totalSignals} signals are real interactions.
            </p>
          </div>

          {!quickResult && !loading && (
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={runQuick}>
              Run quick analysis (3 Greenfield rules)
            </button>
          )}

          {loading && (
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: 12 }}>
              🤖 Applying Greenfield rules...
            </div>
          )}

          {quickResult && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Why Now */}
              <div className="ai-box" style={{ borderLeft: '3px solid var(--accent)' }}>
                <div className="ai-box-title" style={{ color: 'var(--accent)' }}>⚡ Why call now — Stage 0.5</div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{quickResult.why_now as string}</p>
              </div>

              {/* Objection analysis */}
              {quickResult.objection_analysis && (() => {
                const obj = quickResult.objection_analysis as Record<string, string>
                return (
                  <div className="ai-box">
                    <div className="ai-box-title">💬 Objection — one level deeper — Stage 9</div>
                    {obj.objection && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                        <span style={{ background: 'var(--red)', color: '#fff', fontSize: 11, padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                          {obj.objection}
                        </span>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{obj.root_cause}</p>
                      </div>
                    )}
                    {obj.counter && (
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--green)', marginTop: 4 }}>
                        → {obj.counter}
                      </p>
                    )}
                  </div>
                )
              })()}

              {/* Call opener */}
              {quickResult.call_opener && (() => {
                const op = quickResult.call_opener as Record<string, unknown>
                return (
                  <div className="ai-box">
                    <div className="ai-box-title">📞 Open your call with this — Stage 5.5</div>
                    {!op.earned_right && (
                      <p style={{ color: 'var(--yellow)', fontSize: 12, marginBottom: 6 }}>
                        ⚠️ Earned right not yet cleared — log more interactions first
                      </p>
                    )}
                    <div style={{ background: 'var(--bg4)', borderRadius: 7, padding: '10px 12px', marginBottom: 8, fontSize: 13, lineHeight: 1.7, fontStyle: 'italic' }}>
                      "{op.opener as string}"
                    </div>
                    {op.based_on && (
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--text3)' }}>
                        Based on: {op.based_on as string}
                      </p>
                    )}
                  </div>
                )
              })()}

              <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={runQuick}>
                Re-run analysis
              </button>
            </div>
          )}
        </div>
      )}

      {/* FULL RESEARCH MODE */}
      {mode === 'full' && (
        <div>
          {/* Stage selector */}
          <div className="ai-box" style={{ marginBottom: 10 }}>
            <div className="ai-box-title">Choose rules to run</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ALL_STAGES.map(s => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedStages.includes(s.id)}
                    onChange={() => toggleStage(s.id)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          {/* Extra inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[
              { label: 'Website', val: website, set: setWebsite, ph: 'ramesh.in' },
              { label: 'LinkedIn', val: linkedin, set: setLinkedin, ph: 'linkedin.com/in/...' },
              { label: 'Instagram', val: instagram, set: setInstagram, ph: '@handle' },
              { label: 'Mutual contact', val: mutual, set: setMutual, ph: 'e.g. Amit Sharma' },
            ].map(f => (
              <div key={f.label}>
                <label className="fl">{f.label}</label>
                <input className="fi" placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)} />
              </div>
            ))}
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: 10 }}
            onClick={runFull}
            disabled={loading || selectedStages.length === 0}
          >
            {loading ? '🤖 Researching...' : `Run ${selectedStages.length} selected rules`}
          </button>

          {/* Progress */}
          {loading && runningStages.length > 0 && (
            <div className="ai-box" style={{ marginBottom: 10 }}>
              <div className="ai-box-title">Running research</div>
              {runningStages.map(s => (
                <div key={s} style={{ fontSize: 12, color: 'var(--green)', marginBottom: 4 }}>
                  ✓ {ALL_STAGES.find(a => a.id === s)?.label}
                </div>
              ))}
            </div>
          )}

          {/* Full results */}
          {fullResult && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {fullResult.stage_0 && (() => {
                const d = fullResult.stage_0 as Record<string, unknown>
                return (
                  <div className="ai-box">
                    <div className="ai-box-title">Stage 0 — Identity confirmed</div>
                    <p style={{ margin: 0, fontSize: 13 }}>{d.business_name as string} · {d.note as string}</p>
                  </div>
                )
              })()}

              {fullResult.stage_05 && (() => {
                const d = fullResult.stage_05 as { score: number; triggers: { level: string; reason: string }[] }
                return (
                  <div className="ai-box" style={{ borderLeft: '3px solid var(--accent)' }}>
                    <div className="ai-box-title" style={{ color: 'var(--accent)' }}>Stage 0.5 — Trigger radar · Why now score: {d.score}/10</div>
                    {d.triggers?.map((t, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                        <span style={{
                          background: t.level === 'HIGH' ? 'var(--red)' : t.level === 'MED' ? 'var(--orange)' : 'var(--text3)',
                          color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap'
                        }}>{t.level}</span>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{t.reason}</p>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {fullResult.stage_1 && (() => {
                const d = fullResult.stage_1 as Record<string, unknown>
                return (
                  <div className="ai-box">
                    <div className="ai-box-title">Stage 1 — Warm path</div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{d.route as string}</p>
                    {d.action && <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--green)' }}>→ {d.action as string}</p>}
                  </div>
                )
              })()}

              {fullResult.stage_4 && (() => {
                const d = fullResult.stage_4 as { pain_points: string[]; opportunity: string }
                return (
                  <div className="ai-box">
                    <div className="ai-box-title">Stage 4 — Business pain points</div>
                    {d.pain_points?.map((p, i) => <div key={i} style={{ fontSize: 13, marginBottom: 3 }}>• {p}</div>)}
                    {d.opportunity && <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--accent)' }}>{d.opportunity}</p>}
                  </div>
                )
              })()}

              {fullResult.stage_5 && (() => {
                const d = fullResult.stage_5 as Record<string, unknown>
                return (
                  <div className="ai-box">
                    <div className="ai-box-title">Stage 5 — Hiring signals</div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{d.signal as string}</p>
                    {d.pitch_angle && <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--green)' }}>→ {d.pitch_angle as string}</p>}
                  </div>
                )
              })()}

              {fullResult.stage_7 && (() => {
                const d = fullResult.stage_7 as { communication_style: string; priorities: string[]; trust_builder: string }
                return (
                  <div className="ai-box">
                    <div className="ai-box-title">Stage 7 — Leadership style</div>
                    <p style={{ margin: '0 0 6px', fontSize: 13 }}>Style: {d.communication_style}</p>
                    {d.priorities?.map((p, i) => <div key={i} style={{ fontSize: 13, marginBottom: 3 }}>• {p}</div>)}
                    {d.trust_builder && <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--accent)' }}>Trust builder: {d.trust_builder}</p>}
                  </div>
                )
              })()}

              {fullResult.stage_55 && (() => {
                const d = fullResult.stage_55 as { passed: boolean; insight: string; reason: string }
                return (
                  <div className="ai-box" style={{ borderLeft: `3px solid ${d.passed ? 'var(--green)' : 'var(--yellow)'}` }}>
                    <div className="ai-box-title">{d.passed ? '✅' : '⚠️'} Stage 5.5 — Earned right test — {d.passed ? 'PASSED' : 'NOT YET'}</div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{d.reason}</p>
                    {d.insight && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text2)' }}>Insight: {d.insight}</p>}
                  </div>
                )
              })()}

              {fullResult.stage_9 && (() => {
                const d = fullResult.stage_9 as Record<string, string>
                return (
                  <div className="ai-box">
                    <div className="ai-box-title">💬 Stage 9 — Objection prediction</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                      {d.objection && <span style={{ background: 'var(--red)', color: '#fff', fontSize: 11, padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap' }}>{d.objection}</span>}
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{d.root_cause}</p>
                    </div>
                    {d.counter && <p style={{ margin: 0, fontSize: 12, color: 'var(--green)' }}>→ {d.counter}</p>}
                  </div>
                )
              })()}

              {fullResult.stage_11 && (() => {
                const d = fullResult.stage_11 as Record<string, string>
                return (
                  <div className="ai-box">
                    <div className="ai-box-title">📞 Stage 11 — Opening message</div>
                    <div style={{ background: 'var(--bg4)', borderRadius: 7, padding: '10px 12px', marginBottom: 8, fontSize: 13, lineHeight: 1.7, fontStyle: 'italic' }}>
                      "{d.message}"
                    </div>
                    {d.based_on && <p style={{ margin: 0, fontSize: 11, color: 'var(--text3)' }}>Based on: {d.based_on}</p>}
                  </div>
                )
              })()}

              <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={runFull}>
                Re-run research
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

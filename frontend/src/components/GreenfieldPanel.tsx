import { useState, type CSSProperties } from 'react'
import { getQuickAnalysis, getFullResearch } from '../api'

interface Props {
  leadId: string
  score: number
  calls: { objection?: string }[]
  waLogs: unknown[]
  onLogCall: () => void
  onLogWhatsApp: () => void
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

function s(v: unknown): string { return v ? String(v) : '' }

const cardStyle: CSSProperties = {
  background: 'var(--bg3)',
  border: '1px solid var(--border2)',
  borderRadius: 10,
  padding: '14px 16px',
  marginBottom: 10,
}

const cardTitleStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
  color: 'var(--text3)',
  marginBottom: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

function QuickResults({ data }: { data: Record<string, unknown> }) {
  const obj = (data.objection_analysis || {}) as Record<string, string>
  const op = (data.call_opener || {}) as Record<string, unknown>
  const [opOpen, setOpOpen] = useState(true)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Why now */}
      <div style={{ ...cardStyle, background: 'color-mix(in srgb, var(--accent) 8%, var(--bg3))', borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' }}>
        <div style={{ ...cardTitleStyle, color: 'var(--accent)' }}>
          <span>⚡</span> Why call now — Stage 0.5
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.65, color: 'var(--text)' }}>
          {s(data.why_now)}
        </div>
      </div>

      {/* Objection */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}>
          <span>💬</span> Objection — one level deeper — Stage 9
        </div>
        {obj.objection
          ? <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ background: 'var(--red)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 5, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {obj.objection}
                </span>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text)' }}>{obj.root_cause}</div>
              </div>
              {obj.counter && <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>→ {obj.counter}</div>}
            </>
          : <div style={{ fontSize: 13, color: 'var(--text3)' }}>No objection data yet — log more calls.</div>
        }
      </div>

      {/* Opener */}
      <div style={cardStyle}>
        <div style={{ ...cardTitleStyle, justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setOpOpen(p => !p)}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📞</span> Open your call with this — Stage 5.5
          </span>
          <span style={{ fontSize: 12 }}>{opOpen ? '▲' : '▼'}</span>
        </div>
        {opOpen && <>
          {!op.earned_right && (
            <div style={{ fontSize: 12, color: 'var(--yellow)', marginBottom: 8 }}>
              ⚠️ Earned right not yet cleared — log more interactions first
            </div>
          )}
          <div style={{ background: 'var(--bg4)', borderRadius: 8, padding: '12px 14px', fontSize: 13, lineHeight: 1.7, fontStyle: 'italic', color: 'var(--text)', marginBottom: 8 }}>
            "{s(op.opener)}"
          </div>
          {!!op.based_on && (
            <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start', fontSize: 11, color: 'var(--text3)' }}>
              <span>ℹ</span><span>Based on: {s(op.based_on)}</span>
            </div>
          )}
        </>}
      </div>
    </div>
  )
}

function FullResults({ data }: { data: Record<string, unknown> }) {
  const d0 = data.stage_0 as Record<string, unknown> | undefined
  const d05 = data.stage_05 as { score: number; triggers: { level: string; reason: string }[] } | undefined
  const d1 = data.stage_1 as Record<string, unknown> | undefined
  const d4 = data.stage_4 as { pain_points: string[]; opportunity: string } | undefined
  const d5 = data.stage_5 as Record<string, unknown> | undefined
  const d7 = data.stage_7 as { communication_style: string; priorities: string[]; trust_builder: string } | undefined
  const d55 = data.stage_55 as { passed: boolean; insight: string; reason: string } | undefined
  const d9 = data.stage_9 as Record<string, string> | undefined
  const d11 = data.stage_11 as Record<string, string> | undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {d0 && (
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Stage 0 — Identity confirmed</div>
          <div style={{ fontSize: 13 }}>{s(d0.business_name)} · {s(d0.note)}</div>
        </div>
      )}
      {d05 && (
        <div style={{ ...cardStyle, background: 'color-mix(in srgb, var(--accent) 8%, var(--bg3))', borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' }}>
          <div style={{ ...cardTitleStyle, color: 'var(--accent)' }}>
            <span>⚡</span> Stage 0.5 — Trigger radar · Why now score: {d05.score}/10
          </div>
          {d05.triggers?.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ background: t.level === 'HIGH' ? 'var(--red)' : t.level === 'MED' ? 'var(--orange)' : 'var(--text3)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>{t.level}</span>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>{t.reason}</div>
            </div>
          ))}
        </div>
      )}
      {d1 && (
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Stage 1 — Warm path</div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>{s(d1.route)}</div>
          {!!d1.action && <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 6 }}>→ {s(d1.action)}</div>}
        </div>
      )}
      {d4 && (
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Stage 4 — Business pain points</div>
          {d4.pain_points?.map((p, i) => <div key={i} style={{ fontSize: 13, marginBottom: 3 }}>• {p}</div>)}
          {d4.opportunity && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 6 }}>{d4.opportunity}</div>}
        </div>
      )}
      {d5 && (
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Stage 5 — Hiring signals</div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>{s(d5.signal)}</div>
          {!!d5.pitch_angle && <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 6 }}>→ {s(d5.pitch_angle)}</div>}
        </div>
      )}
      {d7 && (
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Stage 7 — Leadership style</div>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Style: {d7.communication_style}</div>
          {d7.priorities?.map((p, i) => <div key={i} style={{ fontSize: 13, marginBottom: 3 }}>• {p}</div>)}
          {d7.trust_builder && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 6 }}>Trust builder: {d7.trust_builder}</div>}
        </div>
      )}
      {d55 && (
        <div style={{ ...cardStyle, borderLeft: `3px solid ${d55.passed ? 'var(--green)' : 'var(--yellow)'}` }}>
          <div style={cardTitleStyle}>{d55.passed ? '✅' : '⚠️'} Stage 5.5 — Earned right — {d55.passed ? 'PASSED' : 'NOT YET'}</div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>{d55.reason}</div>
          {d55.insight && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Insight: {d55.insight}</div>}
        </div>
      )}
      {d9 && (
        <div style={cardStyle}>
          <div style={cardTitleStyle}><span>💬</span> Stage 9 — Objection prediction</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
            {d9.objection && <span style={{ background: 'var(--red)', color: '#fff', fontSize: 11, padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap' }}>{d9.objection}</span>}
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>{d9.root_cause}</div>
          </div>
          {d9.counter && <div style={{ fontSize: 12, color: 'var(--green)' }}>→ {d9.counter}</div>}
        </div>
      )}
      {d11 && (
        <div style={cardStyle}>
          <div style={cardTitleStyle}><span>📞</span> Stage 11 — Opening message</div>
          <div style={{ background: 'var(--bg4)', borderRadius: 8, padding: '12px 14px', fontSize: 13, lineHeight: 1.7, fontStyle: 'italic', marginBottom: 8 }}>
            "{d11.message}"
          </div>
          {d11.based_on && <div style={{ display: 'flex', gap: 5, fontSize: 11, color: 'var(--text3)' }}><span>ℹ</span><span>Based on: {d11.based_on}</span></div>}
        </div>
      )}
    </div>
  )
}

export default function GreenfieldPanel({ leadId, score, calls, waLogs, onLogCall, onLogWhatsApp }: Props) {
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

  const toggleStage = (id: string) =>
    setSelectedStages(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const runQuick = async () => {
    setLoading(true); setQuickResult(null)
    try { const r = await getQuickAnalysis(leadId); setQuickResult(r.data) }
    finally { setLoading(false) }
  }

  const runFull = async () => {
    setLoading(true); setFullResult(null); setRunningStages([])
    for (const st of selectedStages) {
      await new Promise(r => setTimeout(r, 350))
      setRunningStages(prev => [...prev, st])
    }
    try {
      const r = await getFullResearch(leadId, { website, linkedin, instagram, mutual_contact: mutual, stages: selectedStages })
      setFullResult(r.data)
    } finally { setLoading(false) }
  }

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 14, border: '1px solid var(--border2)', borderRadius: 10, overflow: 'hidden' }}>
        <button
          onClick={() => setMode('quick')}
          style={{
            flex: 1, padding: '11px 0', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: mode === 'quick' ? 'var(--accent)' : 'var(--bg3)',
            color: mode === 'quick' ? '#fff' : 'var(--text2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          ⚡ Quick analysis
        </button>
        <button
          onClick={() => setMode('full')}
          style={{
            flex: 1, padding: '11px 0', border: 'none', borderLeft: '1px solid var(--border2)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: mode === 'full' ? 'var(--accent)' : 'var(--bg3)',
            color: mode === 'full' ? '#fff' : 'var(--text2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          🔭 Full research
        </button>
      </div>

      {mode === 'quick' && (
        <div>
          {/* Score breakdown card */}
          <div style={cardStyle}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 14 }}>Score Breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>{score}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>Overall score</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: confidenceColor }}>{confidence}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>Confidence</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
                  {realSignals}<span style={{ fontSize: 14, color: 'var(--text3)' }}>/{totalSignals}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>Real signals</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start', fontSize: 11, color: 'var(--text3)' }}>
              <span style={{ flexShrink: 0 }}>ℹ</span>
              <span>Score is partly based on profile assumptions. Only {realSignals} of {totalSignals} signals are real interactions. Treat as ~{Math.round(score * (0.5 + realSignals * 0.15))}, not {score}.</span>
            </div>
          </div>

          {!quickResult && !loading && (
            <button className="btn btn-primary" style={{ width: '100%', padding: '12px 0', fontSize: 14 }} onClick={runQuick}>
              Run quick analysis (3 Greenfield rules)
            </button>
          )}
          {loading && (
            <div style={{ textAlign: 'center', padding: '18px 0', fontSize: 13, color: 'var(--text3)' }}>
              🤖 Applying Greenfield rules...
            </div>
          )}
          {quickResult && !loading && (
            <>
              <QuickResults data={quickResult} />
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 4, marginBottom: 10 }} onClick={runQuick}>
                Re-run analysis
              </button>
            </>
          )}
        </div>
      )}

      {mode === 'full' && (
        <div>
          <div style={cardStyle}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 12 }}>Choose rules to run</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {ALL_STAGES.map(st => (
                <label key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, cursor: 'pointer', color: 'var(--text2)' }}>
                  <input type="checkbox" checked={selectedStages.includes(st.id)} onChange={() => toggleStage(st.id)} />
                  {st.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {([
              { label: 'Website', val: website, set: setWebsite, ph: 'ramesh.in' },
              { label: 'LinkedIn', val: linkedin, set: setLinkedin, ph: 'linkedin.com/in/...' },
              { label: 'Instagram', val: instagram, set: setInstagram, ph: '@handle' },
              { label: 'Mutual contact', val: mutual, set: setMutual, ph: 'e.g. Amit Sharma' },
            ] as { label: string; val: string; set: (v: string) => void; ph: string }[]).map(f => (
              <div key={f.label}>
                <label className="fl">{f.label}</label>
                <input className="fi" placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)} />
              </div>
            ))}
          </div>

          <button className="btn btn-primary" style={{ width: '100%', padding: '12px 0', marginBottom: 12 }} onClick={runFull} disabled={loading || selectedStages.length === 0}>
            {loading ? '🤖 Researching...' : `Run ${selectedStages.length} selected rules`}
          </button>

          {loading && runningStages.length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 10 }}>Running research</div>
              {runningStages.map(st => (
                <div key={st} style={{ fontSize: 12, color: 'var(--green)', marginBottom: 4 }}>
                  ✓ {ALL_STAGES.find(a => a.id === st)?.label}
                </div>
              ))}
            </div>
          )}

          {fullResult && !loading && (
            <>
              <FullResults data={fullResult} />
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 4, marginBottom: 10 }} onClick={runFull}>
                Re-run research
              </button>
            </>
          )}
        </div>
      )}

      {/* Bottom action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
        <button
          onClick={onLogCall}
          style={{ padding: '11px 0', border: '1px solid var(--border2)', borderRadius: 9, background: 'var(--bg3)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
        >
          📞 Log call
        </button>
        <button
          onClick={onLogWhatsApp}
          style={{ padding: '11px 0', border: '1px solid var(--border2)', borderRadius: 9, background: 'var(--bg3)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
        >
          💬 Log WhatsApp
        </button>
      </div>
    </div>
  )
}

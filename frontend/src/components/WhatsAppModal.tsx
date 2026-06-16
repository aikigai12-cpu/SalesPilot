import { useState } from 'react'
import { parseWhatsapp } from '../api'

interface Props {
  open: boolean
  leadId: string | null
  onClose: () => void
  onSaved: () => void
}

export default function WhatsAppModal({ open, leadId, onClose, onSaved }: Props) {
  const [text, setText] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState<Record<string, string> | null>(null)

  const handleAnalyse = async () => {
    if (!leadId || !text.trim()) return
    setParsing(true)
    try {
      const r = await parseWhatsapp(leadId, text)
      setResult(r.data)
      onSaved()
    } finally {
      setParsing(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hd">
          <div className="modal-title">Add WhatsApp Chat</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="fg">
          <label className="fl">Paste chat or type summary</label>
          <textarea
            className="ft"
            style={{ minHeight: 90 }}
            placeholder={"Rajesh: July pakka bhai. Abhi thoda busy hoon..."}
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </div>

        <div className="ai-box">
          <div className="ai-box-title">AI will extract from this:</div>
          <p>Sentiment · Cohort promise (auto-assigns event) · Objection · Follow-up needed</p>
        </div>

        <div className="fg">
          <label className="fl">Chat Date</label>
          <input className="fi" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        {result && (
          <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--green)', marginBottom: 6, fontSize: 11 }}>✅ AI Analysis</div>
            {result.ai_sentiment && <div style={{ marginBottom: 4 }}><span style={{ color: 'var(--text3)' }}>Sentiment: </span><span style={{ color: 'var(--text)' }}>{result.ai_sentiment}</span></div>}
            {result.ai_objection && <div style={{ marginBottom: 4 }}><span style={{ color: 'var(--text3)' }}>Objection: </span><span style={{ color: 'var(--orange)' }}>{result.ai_objection}</span></div>}
            {result.ai_cohort_promise && <div style={{ marginBottom: 4 }}><span style={{ color: 'var(--text3)' }}>Cohort Promise: </span><span style={{ color: 'var(--green)' }}>{result.ai_cohort_promise}</span></div>}
            {result.ai_summary && <div style={{ color: 'var(--text2)', marginTop: 4 }}>{result.ai_summary}</div>}
          </div>
        )}

        {!leadId && <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>Open a lead profile first to link this chat.</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAnalyse} disabled={parsing || !leadId || !text.trim()}>
            {parsing ? '🤖 AI Analysing...' : 'Analyse & Save'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

import { useState, useRef } from 'react'
import api from '../api'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export default function BulkUploadModal({ open, onClose, onSaved }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ added: number; skipped: number; errors: string[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDownload = () => {
    window.open(`${import.meta.env.VITE_API_URL || '/api'}/bulk/template`, '_blank')
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await api.post('/bulk/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(r.data)
      if (r.data.added > 0) onSaved()
    } catch (e: any) {
      setResult({ added: 0, skipped: 0, errors: [e?.response?.data?.error || 'Upload failed'] })
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setResult(null)
    onClose()
  }

  if (!open) return null

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="modal">
        <div className="modal-hd">
          <div className="modal-title">Bulk Upload Leads</div>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>

        {/* Step 1 */}
        <div className="ai-box" style={{ marginBottom: 14 }}>
          <div className="ai-box-title">Step 1 — Download Template</div>
          <p>Download the Excel template with dropdowns pre-filled for business type, team size, source, and cohort. Cohort dropdown reflects your actual cohorts in the system.</p>
        </div>
        <button className="btn btn-ghost" style={{ width: '100%', marginBottom: 14 }} onClick={handleDownload}>
          ⬇ Download Excel Template (.xlsx)
        </button>

        <div className="divider" />

        {/* Step 2 */}
        <div className="ai-box" style={{ marginBottom: 14, marginTop: 14 }}>
          <div className="ai-box-title">Step 2 — Fill & Upload</div>
          <p>Fill in your leads (only name + phone required). Upload the file below — AI will score each lead automatically.</p>
        </div>

        <div
          style={{ border: '2px dashed var(--border2)', borderRadius: 9, padding: '20px', textAlign: 'center', cursor: 'pointer', marginBottom: 12, background: file ? 'rgba(0,212,160,0.05)' : 'transparent' }}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { setFile(e.target.files?.[0] || null); setResult(null) }} />
          {file ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>✅ {file.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Click to change file</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 24, marginBottom: 6 }}>📂</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Click to select Excel file</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>.xlsx files only · max 1000 rows</div>
            </div>
          )}
        </div>

        {result && (
          <div style={{ marginBottom: 12, background: 'var(--bg3)', borderRadius: 8, padding: 10 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: result.errors.length ? 8 : 0 }}>
              <div><span style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>{result.added}</span><span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>added</span></div>
              {result.skipped > 0 && <div><span style={{ fontSize: 18, fontWeight: 800, color: 'var(--orange)' }}>{result.skipped}</span><span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>skipped</span></div>}
            </div>
            {result.errors.map((e, i) => <div key={i} style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>⚠ {e}</div>)}
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? '⏳ Uploading & Scoring...' : 'Upload Leads →'}
        </button>
      </div>
    </div>
  )
}

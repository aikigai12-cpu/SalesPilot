import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createLead } from '../api'

export default function AddLead() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', phone: '', whatsapp: '', business_type: '', city: '',
    team_size: '', revenue_range: '', source: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name || !form.phone) { setError('Name and Phone are required'); return }
    setSaving(true)
    try {
      const r = await createLead(form)
      navigate(`/leads/${r.data.id}`)
    } catch {
      setError('Failed to save lead. Check backend is running.')
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    { name: 'name', label: 'Full Name *', placeholder: 'Rajesh Kumar' },
    { name: 'phone', label: 'Phone *', placeholder: '+91 98765 43210' },
    { name: 'whatsapp', label: 'WhatsApp', placeholder: 'If different from phone' },
    { name: 'business_type', label: 'Business Type', placeholder: 'Retail / Manufacturing / Services' },
    { name: 'city', label: 'City', placeholder: 'Mumbai' },
    { name: 'team_size', label: 'Team Size', placeholder: '10–50' },
    { name: 'revenue_range', label: 'Revenue Range', placeholder: '1–5 Cr / 5–25 Cr' },
    { name: 'source', label: 'Lead Source', placeholder: 'Referral / LinkedIn / Event' },
  ]

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>Add New Lead</h1>
      <p className="text-[15px] mb-8" style={{ color: 'var(--muted)' }}>AI will auto-score once you add call logs or WhatsApp chat.</p>

      <div className="rounded-2xl p-6 space-y-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        {fields.map(f => (
          <div key={f.name}>
            <label className="block text-[14px] font-medium mb-2" style={{ color: 'var(--muted)' }}>{f.label}</label>
            <input
              type="text"
              placeholder={f.placeholder}
              value={form[f.name as keyof typeof form]}
              onChange={e => set(f.name, e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-[15px] outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>
        ))}

        {error && <p className="text-[14px] font-medium" style={{ color: '#ef4444' }}>{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-3 rounded-xl font-semibold text-[15px] hover:opacity-90 transition-all"
            style={{ background: 'var(--accent)', color: '#0f1117', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving...' : 'Add Lead'}
          </button>
          <button
            onClick={() => navigate('/leads')}
            className="px-6 py-3 rounded-xl font-semibold text-[15px]"
            style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import AllLeads from './pages/AllLeads'
import CohortView from './pages/CohortView'
import Reminders from './pages/Reminders'
import AIReport from './pages/AIReport'
import LeadDetail from './pages/LeadDetail'
import Login from './pages/Login'
import AddLeadModal from './components/AddLeadModal'
import LogCallModal from './components/LogCallModal'
import WhatsAppModal from './components/WhatsAppModal'
import NewCohortModal from './components/NewCohortModal'
import BulkUploadModal from './components/BulkUploadModal'
import { getCohorts } from './api'
import { useAuth } from './AuthContext'

export interface Cohort {
  id: string; name: string; is_active: boolean; is_future: boolean; start_date?: string
}

export interface ModalState {
  addLead: boolean; logCall: boolean; whatsapp: boolean; newCohort: boolean; activeLeadId: string | null
}

export default function App() {
  const { user, profile, loading, signOut, viewingAs, setViewingAs, allProfiles } = useAuth()
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [modals, setModals] = useState<ModalState>({
    addLead: false, logCall: false, whatsapp: false, newCohort: false, activeLeadId: null
  })
  const [bulkOpen, setBulkOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const loadCohorts = () => getCohorts().then(r => setCohorts(r.data)).catch(() => {})

  useEffect(() => { if (user) loadCohorts() }, [user])

  useEffect(() => {
    if (viewingAs) sessionStorage.setItem('view_as_user_id', viewingAs.id)
    else sessionStorage.removeItem('view_as_user_id')
    if (user) loadCohorts()
  }, [viewingAs])

  const openModal = (name: keyof Omit<ModalState,'activeLeadId'>, leadId?: string) =>
    setModals(p => ({ ...p, [name]: true, activeLeadId: leadId || p.activeLeadId }))
  const closeModal = (name: keyof Omit<ModalState,'activeLeadId'>) =>
    setModals(p => ({ ...p, [name]: false }))

  if (loading) {
    return (
      <div style={{ width:'100vw', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg1)' }}>
        <div style={{ color:'var(--text3)', fontSize:13 }}>Loading...</div>
      </div>
    )
  }

  if (!user) return <Login />

  const pageTitle = () => {
    const p = location.pathname
    if (p === '/') return 'Dashboard'
    if (p === '/leads') return 'All Leads'
    if (p === '/reminders') return 'Reminders'
    if (p === '/ai-report') return 'AI Report'
    if (p.startsWith('/leads/')) return 'Lead Profile'
    if (p.startsWith('/cohort/')) {
      const id = p.split('/')[2]
      const c = cohorts.find(c => c.id === id)
      return c?.name || 'Cohort'
    }
    return 'SalesPilot'
  }

  const isActive = (path: string) => location.pathname === path ? 'nav-item active' : 'nav-item'
  const isCohortActive = (id: string) => location.pathname === `/cohort/${id}` ? 'cohort-nav-item active' : 'cohort-nav-item'

  const activeCohorts = cohorts.filter(c => c.is_active)
  const futureCohorts = cohorts.filter(c => c.is_future)
  const pastCohorts = cohorts.filter(c => !c.is_active && !c.is_future)

  const displayName = viewingAs?.name || profile?.name || user.email || 'User'
  const displayAvatar = viewingAs?.avatar || profile?.avatar || ''

  return (
    <>
      <div className="sidebar">
        <div className="logo">
          <div className="logo-text">Sales<span>Pilot</span></div>
          <div className="logo-sub">AI Sales Intelligence</div>
        </div>

        {/* User card */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border1)', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {displayAvatar
              ? <img src={displayAvatar} style={{ width: 28, height: 28, borderRadius: '50%' }} />
              : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#000' }}>
                  {displayName[0]?.toUpperCase()}
                </div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {viewingAs ? `👁 ${viewingAs.name}` : displayName}
              </div>
              <div style={{ fontSize: 10, color: profile?.role === 'admin' ? 'var(--orange)' : 'var(--text3)' }}>
                {profile?.role === 'admin' ? '👑 Admin' : 'Salesperson'}
              </div>
            </div>
            <button onClick={signOut} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 10, cursor: 'pointer', padding: '2px 4px' }}>
              Sign out
            </button>
          </div>
        </div>

        <div className="sidebar-scroll">
          <div className="nav-section">
            <div className="nav-section-label">Main</div>
            <button className={isActive('/')} onClick={() => navigate('/')}>
              <span className="nav-icon">◉</span> Dashboard
            </button>
            <button className={isActive('/leads')} onClick={() => navigate('/leads')}>
              <span className="nav-icon">◎</span> All Leads
            </button>
            <button className={isActive('/reminders')} onClick={() => navigate('/reminders')}>
              <span className="nav-icon">◷</span> Reminders
            </button>
            <button className={isActive('/ai-report')} onClick={() => navigate('/ai-report')}>
              <span className="nav-icon">◧</span> AI Report
            </button>
          </div>

          <div className="sidebar-divider" />

          <div className="nav-section">
            <div className="nav-section-label">Events / Cohorts</div>
            {activeCohorts.map(c => (
              <button key={c.id} className={isCohortActive(c.id)} onClick={() => navigate(`/cohort/${c.id}`)}>
                <div className="cohort-dot cd-active" />
                <div className="cohort-nav-info">
                  <div className="cohort-nav-name">{c.name}</div>
                  <div className="cohort-nav-count">Active cohort</div>
                </div>
              </button>
            ))}
            {futureCohorts.map(c => (
              <button key={c.id} className={isCohortActive(c.id)} onClick={() => navigate(`/cohort/${c.id}`)}>
                <div className="cohort-dot cd-future" />
                <div className="cohort-nav-info">
                  <div className="cohort-nav-name">{c.name}</div>
                  <div className="cohort-nav-count">System · all unassigned leads</div>
                </div>
              </button>
            ))}
            {pastCohorts.map(c => (
              <button key={c.id} className={isCohortActive(c.id)} onClick={() => navigate(`/cohort/${c.id}`)}>
                <div className="cohort-dot cd-past" />
                <div className="cohort-nav-info">
                  <div className="cohort-nav-name">{c.name}</div>
                  <div className="cohort-nav-count">Closed</div>
                </div>
              </button>
            ))}
          </div>

          <div className="nav-section" style={{ paddingBottom: 10 }}>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => openModal('newCohort')}>
              + New Cohort
            </button>
          </div>
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <div><div className="topbar-title">{pageTitle()}</div></div>
          <div className="topbar-right">
            {profile?.role === 'admin' && allProfiles.length > 0 && (
              <select
                value={viewingAs?.id || ''}
                onChange={e => {
                  const id = e.target.value
                  setViewingAs(id ? allProfiles.find(p => p.id === id) || null : null)
                  window.dispatchEvent(new Event('leads-updated'))
                }}
                style={{
                  background: 'var(--bg3)', border: '1px solid var(--orange)',
                  color: 'var(--orange)', borderRadius: 7, fontSize: 11,
                  padding: '5px 10px', cursor: 'pointer', fontWeight: 600
                }}
              >
                <option value="">👑 All Users</option>
                {allProfiles.map(p => (
                  <option key={p.id} value={p.id}>👁 {p.name}</option>
                ))}
              </select>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => openModal('whatsapp')}>+ WhatsApp Chat</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setBulkOpen(true)}>⬆ Bulk Upload</button>
            <button className="btn btn-primary btn-sm" onClick={() => openModal('addLead')}>+ Add Lead</button>
          </div>
        </div>
        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard openModal={openModal} />} />
            <Route path="/leads" element={<AllLeads openModal={openModal} />} />
            <Route path="/leads/:id" element={<LeadDetail openModal={openModal} />} />
            <Route path="/cohort/:id" element={<CohortView cohorts={cohorts} openModal={openModal} />} />
            <Route path="/reminders" element={<Reminders openModal={openModal} />} />
            <Route path="/ai-report" element={<AIReport />} />
          </Routes>
        </div>
      </div>

      <AddLeadModal open={modals.addLead} cohorts={cohorts} onClose={() => closeModal('addLead')}
        onSaved={() => { closeModal('addLead'); window.dispatchEvent(new Event('leads-updated')) }} />
      <LogCallModal open={modals.logCall} leadId={modals.activeLeadId} onClose={() => closeModal('logCall')}
        onSaved={() => { closeModal('logCall'); window.dispatchEvent(new Event('leads-updated')) }} />
      <WhatsAppModal open={modals.whatsapp} leadId={modals.activeLeadId} onClose={() => closeModal('whatsapp')}
        onSaved={() => { closeModal('whatsapp'); window.dispatchEvent(new Event('leads-updated')) }} />
      <NewCohortModal open={modals.newCohort} onClose={() => closeModal('newCohort')}
        onSaved={() => { closeModal('newCohort'); loadCohorts() }} />
      <BulkUploadModal open={bulkOpen} onClose={() => setBulkOpen(false)}
        onSaved={() => { setBulkOpen(false); window.dispatchEvent(new Event('leads-updated')) }} />
    </>
  )
}

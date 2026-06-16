import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import AllLeads from './pages/AllLeads'
import CohortView from './pages/CohortView'
import Reminders from './pages/Reminders'
import AIReport from './pages/AIReport'
import LeadDetail from './pages/LeadDetail'
import AddLeadModal from './components/AddLeadModal'
import LogCallModal from './components/LogCallModal'
import WhatsAppModal from './components/WhatsAppModal'
import NewCohortModal from './components/NewCohortModal'
import { getCohorts } from './api'

export interface Cohort {
  id: string
  name: string
  is_active: boolean
  is_future: boolean
  start_date?: string
}

export interface ModalState {
  addLead: boolean
  logCall: boolean
  whatsapp: boolean
  newCohort: boolean
  activeLeadId: string | null
}

export default function App() {
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [modals, setModals] = useState<ModalState>({
    addLead: false, logCall: false, whatsapp: false, newCohort: false, activeLeadId: null
  })
  const navigate = useNavigate()
  const location = useLocation()

  const loadCohorts = () => getCohorts().then(r => setCohorts(r.data)).catch(() => {})
  useEffect(() => { loadCohorts() }, [])

  const openModal = (name: keyof Omit<ModalState,'activeLeadId'>, leadId?: string) =>
    setModals(p => ({ ...p, [name]: true, activeLeadId: leadId || p.activeLeadId }))
  const closeModal = (name: keyof Omit<ModalState,'activeLeadId'>) =>
    setModals(p => ({ ...p, [name]: false }))

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

  return (
    <>
      <div className="sidebar">
        <div className="logo">
          <div className="logo-text">Sales<span>Pilot</span></div>
          <div className="logo-sub">AI Sales Intelligence</div>
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
            <button className="btn btn-ghost btn-sm" onClick={() => openModal('whatsapp')}>+ WhatsApp Chat</button>
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

      <AddLeadModal
        open={modals.addLead}
        cohorts={cohorts}
        onClose={() => closeModal('addLead')}
        onSaved={() => { closeModal('addLead'); window.dispatchEvent(new Event('leads-updated')) }}
      />
      <LogCallModal
        open={modals.logCall}
        leadId={modals.activeLeadId}
        onClose={() => closeModal('logCall')}
        onSaved={() => { closeModal('logCall'); window.dispatchEvent(new Event('leads-updated')) }}
      />
      <WhatsAppModal
        open={modals.whatsapp}
        leadId={modals.activeLeadId}
        onClose={() => closeModal('whatsapp')}
        onSaved={() => { closeModal('whatsapp'); window.dispatchEvent(new Event('leads-updated')) }}
      />
      <NewCohortModal
        open={modals.newCohort}
        onClose={() => closeModal('newCohort')}
        onSaved={() => { closeModal('newCohort'); loadCohorts() }}
      />
    </>
  )
}

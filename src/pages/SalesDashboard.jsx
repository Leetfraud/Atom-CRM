import { useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'
import ProspectTable from '../components/prospects/ProspectTable'
import ProspectModal from '../components/prospects/ProspectModal'
import ProspectNotesPanel from '../components/prospects/ProspectNotesPanel'
import ProspectForm from '../components/prospects/ProspectForm'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Dropdown from '../components/ui/Dropdown'
import StatCard from '../components/ui/StatCard'
import { useProspects } from '../hooks/useProspects'
import { EMAIL_PIPELINE_STAGES, LINKEDIN_DM_STATUSES } from '../utils/constants'

const icons = {
  people: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="7" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="8" r="2.4" /><path d="M15.5 14.2c2.6.4 4.5 2.6 4.5 5.3" /></svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 15l6-6" /><path d="M8 10a3 3 0 010-4l2-2a3 3 0 014 4" /><path d="M16 14a3 3 0 010 4l-2 2a3 3 0 01-4-4" /></svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" /></svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
  ),
  trophy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0V4z" /><path d="M7 5H4a3 3 0 003 3M17 5h3a3 3 0 01-3 3" /></svg>
  ),
}

export default function SalesDashboard() {
  const [search, setSearch] = useState('')
  const [emailFilter, setEmailFilter] = useState('')
  const [liFilter, setLiFilter] = useState('')
  const [selectedProspectId, setSelectedProspectId] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const { prospects, loading, filterProspects, addProspect, refetch, generateSerial, updateProspect, updateProspectLocal, deleteProspect } = useProspects()
  const [pipelineMode, setPipelineMode] = useState('email') // 'email' | 'linkedin'

  const selectedProspect = prospects.find(p => p.id === selectedProspectId) ?? null

  // Filter prospects client-side by pipeline stage
  const searched = filterProspects(search)
  const filtered = searched.filter(p => {
    const emailStage = p.email_pipeline?.[0]?.stage ?? ''
    const liDM = p.linkedin_pipeline?.[0]?.dm_status ?? ''
    return (
      (!emailFilter || emailStage === emailFilter) &&
      (!liFilter || liDM === liFilter)
    )
  })


  // Quick stats
  const total = prospects.length
  const connected = prospects.filter(p => p.linkedin_pipeline?.[0]?.connection_status === 'Connected').length
  const requestSent = prospects.filter(p => p.linkedin_pipeline?.[0]?.connection_status === 'Request Sent').length
  const replied = prospects.filter(p => p.email_pipeline?.[0]?.replied).length
  const closed = prospects.filter(p => p.email_pipeline?.[0]?.stage === 'Closed').length

  function handleSelectProspect(prospect, index, shiftKey) {
    if (shiftKey && lastSelectedIndex !== null) {
      const lo = Math.min(lastSelectedIndex, index)
      const hi = Math.max(lastSelectedIndex, index)
      const rangeIds = filtered.slice(lo, hi + 1).map(p => p.id)
      setSelectedIds(prev => {
        const next = new Set(prev)
        rangeIds.forEach(id => next.add(id))
        return next
      })
    } else {
      const toggling = selectedIds.has(prospect.id)
      setSelectedIds(prev => {
        const next = new Set(prev)
        toggling ? next.delete(prospect.id) : next.add(prospect.id)
        return next
      })
      setSelectedProspectId(prev => prev === prospect.id ? null : prospect.id)
      setLastSelectedIndex(index)
    }
  }

  async function handleAddProspect(data) {
    const { error } = await addProspect(data)
    if (!error) setShowAddModal(false)
    return { error }
  }

  return (
    <div className="min-h-screen bg-ink p-5 md:p-6">
      <Topbar
        title="Prospects"
        actions={
          <Button onClick={() => setShowAddModal(true)}>
            + Add Prospect
          </Button>
        }
      />

      <div className="flex gap-5 items-start">
        <Sidebar />

        <main className="flex-1 min-w-0 flex flex-col gap-5">
          {/* Stats row */}
          <div className="bg-card border border-line rounded-[26px] p-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Total Prospects" value={total} icon={icons.people} />
              <StatCard label="LI Connected" value={connected} icon={icons.link} sub={`${total ? ((connected/total)*100).toFixed(0) : 0}% acceptance rate`} />
              <StatCard label="Request Sent" value={requestSent} icon={icons.send} />
              <StatCard label="Email Replies" value={replied} icon={icons.mail} sub={`${total ? ((replied/total)*100).toFixed(0) : 0}% reply rate`} />
              <StatCard label="Closed" value={closed} icon={icons.trophy} accent />
            </div>
          </div>

          {/* Filters + table */}
          <div className="bg-card border border-line rounded-[26px] p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, company, LinkedIn URL..."
                className="w-80"
              />

              {/* Pipeline mode switch */}
              <div className="flex items-center bg-card-2 border border-line rounded-full p-1 gap-1">
                <button
                  onClick={() => { setPipelineMode('email'); setLiFilter('') }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[11px] uppercase tracking-wide transition ${
                    pipelineMode === 'email' ? 'bg-paper text-ink' : 'text-fog hover:text-paper'
                  }`}
                >
                  <span className="w-3.5 h-3.5">{icons.mail}</span> Email
                </button>
                <button
                  onClick={() => { setPipelineMode('linkedin'); setEmailFilter('') }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[11px] uppercase tracking-wide transition ${
                    pipelineMode === 'linkedin' ? 'bg-paper text-ink' : 'text-fog hover:text-paper'
                  }`}
                >
                  <span className="w-3.5 h-3.5">{icons.link}</span> LinkedIn
                </button>
              </div>

              {/* Contextual filter dropdown */}
              {pipelineMode === 'email' ? (
                <Dropdown
                  value={emailFilter}
                  onChange={setEmailFilter}
                  options={[{ value: '', label: 'All Email Stages' }, ...EMAIL_PIPELINE_STAGES.map(s => ({ value: s, label: s }))]}
                />
              ) : (
                <Dropdown
                  value={liFilter}
                  onChange={setLiFilter}
                  options={[{ value: '', label: 'All LI Statuses' }, ...LINKEDIN_DM_STATUSES.map(s => ({ value: s, label: s }))]}
                />
              )}

              {(emailFilter || liFilter || search) && (
                <button
                  onClick={() => { setSearch(''); setEmailFilter(''); setLiFilter('') }}
                  className="font-mono text-[11px] uppercase tracking-wide text-fog hover:text-paper transition"
                >
                  Clear
                </button>
              )}
              <span className="font-mono text-[11px] text-fog ml-auto">{filtered.length} prospects</span>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ProspectTable
                prospects={filtered}
                selectedId={selectedProspect?.id}
                selectedIds={selectedIds}
                onSelectProspect={handleSelectProspect}
              />
            )}
          </div>
        </main>
      </div>

      {/* Notes Panel */}
      {selectedProspect && <ProspectNotesPanel prospect={selectedProspect} />}

      {/* Side Panel */}
      {selectedProspect && (
        <ProspectModal
          prospect={selectedProspect}
          onClose={() => setSelectedProspectId(null)}
          updateProspect={updateProspect}
          updateProspectLocal={updateProspectLocal}
          deleteProspect={deleteProspect}
        />
      )}

      {/* Add Prospect Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Prospect" width="max-w-3xl">
        <ProspectForm
          onSubmit={handleAddProspect}
          onCancel={() => setShowAddModal(false)}
          loading={loading}
          generateSerial={generateSerial}
        />
      </Modal>
    </div>
  )
}

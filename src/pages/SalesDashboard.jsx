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

export default function SalesDashboard() {
  const [search, setSearch] = useState('')
  const [emailFilter, setEmailFilter] = useState('')
  const [liFilter, setLiFilter] = useState('')
  const [selectedProspectId, setSelectedProspectId] = useState(null)
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

  async function handleAddProspect(data) {
    const { error } = await addProspect(data)
    if (!error) setShowAddModal(false)
    return { error }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <Sidebar />

      <div className="flex-1 ml-56">
        <Topbar
          title="Prospects"
          actions={
            <Button onClick={() => setShowAddModal(true)}>
              + Add Prospect
            </Button>
          }
        />

        <main className={`pt-14 transition-all ${selectedProspect ? 'ml-72 mr-[420px]' : ''}`}>
          {/* Stats row */}
          <div className="grid grid-cols-5 gap-4 p-6 border-b border-[#1f1f1f]">
            <StatCard label="Total Prospects" value={total} icon="👥" />
            <StatCard label="LI Connected" value={connected} icon="🔗" sub={`${total ? ((connected/total)*100).toFixed(0) : 0}% acceptance rate`} />
            <StatCard label="Request Sent" value={requestSent} icon="📨" />
            <StatCard label="Email Replies" value={replied} icon="✉️" sub={`${total ? ((replied/total)*100).toFixed(0) : 0}% reply rate`} />
            <StatCard label="Closed" value={closed} icon="🏆" accent />
          </div>

          {/* Filters */}
<div className="flex items-center gap-3 px-6 py-4 border-b border-[#1f1f1f]">
  <Input
    value={search}
    onChange={e => setSearch(e.target.value)}
    placeholder="Search by name, email, company, LinkedIn URL..."
    className="w-80"
  />

  {/* Pipeline mode switch */}
  <div className="flex items-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-1 gap-1">
    <button
      onClick={() => { setPipelineMode('email'); setLiFilter('') }}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
        pipelineMode === 'email'
          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
          : 'text-zinc-500 hover:text-white'
      }`}
    >
      ✉️ Email
    </button>
    <button
      onClick={() => { setPipelineMode('linkedin'); setEmailFilter('') }}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
        pipelineMode === 'linkedin'
          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
          : 'text-zinc-500 hover:text-white'
      }`}
    >
      🔗 LinkedIn
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
      className="text-zinc-500 hover:text-white text-sm transition"
    >
      Clear
    </button>
  )}
  <span className="text-zinc-600 text-xs ml-auto">{filtered.length} prospects</span>
</div>

          {/* Table + Side Panel */}
          <div className="flex">
            <div className="flex-1 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <ProspectTable
                  prospects={filtered}
                  selectedId={selectedProspect?.id}
                  onSelectProspect={p => setSelectedProspectId(prev => prev === p.id ? null : p.id)}
                />
              )}
            </div>
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
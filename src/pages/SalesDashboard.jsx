import { useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'
import ProspectTable from '../components/prospects/ProspectTable'
import ProspectModal from '../components/prospects/ProspectModal'
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
  const [selectedProspect, setSelectedProspect] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const { prospects, loading, addProspect, refetch, generateSerial } = useProspects(search)

  // Filter prospects client-side by pipeline stage
  const filtered = prospects.filter(p => {
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
  const replied = prospects.filter(p => p.email_pipeline?.[0]?.replied).length
  const closed = prospects.filter(p => p.email_pipeline?.[0]?.stage === 'Closed').length

  async function handleAddProspect(data) {
    const { error } = await addProspect(data)
    if (!error) setShowAddModal(false)
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

        <main className="pt-14">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4 p-6 border-b border-[#1f1f1f]">
            <StatCard label="Total Prospects" value={total} icon="👥" />
            <StatCard label="LI Connected" value={connected} icon="🔗" sub={`${total ? ((connected/total)*100).toFixed(0) : 0}% acceptance rate`} />
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
            <Dropdown
              value={emailFilter}
              onChange={setEmailFilter}
              options={[{ value: '', label: 'All Email Stages' }, ...EMAIL_PIPELINE_STAGES.map(s => ({ value: s, label: s }))]}
            />
            <Dropdown
              value={liFilter}
              onChange={setLiFilter}
              options={[{ value: '', label: 'All LI Statuses' }, ...LINKEDIN_DM_STATUSES.map(s => ({ value: s, label: s }))]}
            />
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
          <div className={`flex ${selectedProspect ? 'mr-[420px]' : ''} transition-all`}>
            <div className="flex-1 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <ProspectTable
                  prospects={filtered}
                  selectedId={selectedProspect?.id}
                  onSelectProspect={p => setSelectedProspect(prev => prev?.id === p.id ? null : p)}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Side Panel */}
      {selectedProspect && (
        <ProspectModal
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
          onUpdated={() => {
            refetch()
            // Keep panel open but refresh data
          }}
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
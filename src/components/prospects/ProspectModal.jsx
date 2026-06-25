import { useState } from 'react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Dropdown from '../ui/Dropdown'
import Input from '../ui/Input'
import { formatDate } from '../../utils/formatDate'
import { useEmailActivity } from '../../hooks/useEmailActivity'
import { useLinkedinActivity } from '../../hooks/useLinkedinActivity'
import { useProspects } from '../../hooks/useProspects'
import {
  EMAIL_PIPELINE_STAGES,
  LINKEDIN_CONNECTION_STATUSES,
  LINKEDIN_DM_STATUSES,
  PROSPECT_TAGS
} from '../../utils/constants'

export default function ProspectModal({ prospect, onClose, onUpdated }) {
  const { deleteProspect, updateProspect } = useProspects()
  const { updateEmailPipeline } = useEmailActivity()
  const { updateLinkedinPipeline } = useLinkedinActivity()
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    first_name: prospect.first_name ?? '',
    last_name: prospect.last_name ?? '',
    company: prospect.company ?? '',
    role_title: prospect.role_title ?? '',
    email: prospect.email ?? '',
    linkedin_url: prospect.linkedin_url ?? '',
    company_url: prospect.company_url ?? '',
    youtube_url: prospect.youtube_url ?? '',
    gamma_doc_url: prospect.gamma_doc_url ?? '',
    place: prospect.place ?? '',
    notes: prospect.notes ?? '',
  })
  const [tags, setTags] = useState(prospect.prospect_tags?.map(t => t.tag) ?? [])

  if (!prospect) return null

  const email = prospect.email_pipeline?.[0]
  const li = prospect.linkedin_pipeline?.[0]

  function setField(field, value) {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleTag(tag) {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  async function handleSaveEdit() {
    setSaving(true)
    await updateProspect(prospect.id, editForm)

    // Sync tags — delete all then reinsert
    const { supabase } = await import('../../lib/supabase')
    await supabase.from('prospect_tags').delete().eq('prospect_id', prospect.id)
    if (tags.length > 0) {
      await supabase.from('prospect_tags').insert(
        tags.map(tag => ({ prospect_id: prospect.id, tag }))
      )
    }

    onUpdated()
    setEditing(false)
    setSaving(false)
  }

  async function handleEmailStageChange(stage) {
    setSaving(true)
    await updateEmailPipeline(prospect.id, { stage })
    onUpdated()
    setSaving(false)
  }

  async function handleLIConnectionChange(status) {
    setSaving(true)
    await updateLinkedinPipeline(prospect.id, { connection_status: status })
    onUpdated()
    setSaving(false)
  }

  async function handleLIDMChange(status) {
    setSaving(true)
    await updateLinkedinPipeline(prospect.id, { dm_status: status })
    onUpdated()
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete ${prospect.first_name} ${prospect.last_name}? This cannot be undone.`)) return
    await deleteProspect(prospect.id)
    onClose()
  }

  const links = [
    { label: 'Email', value: prospect.email, href: `mailto:${prospect.email}` },
    { label: 'LinkedIn', value: prospect.linkedin_url, href: prospect.linkedin_url },
    { label: 'Company', value: prospect.company_url, href: prospect.company_url },
    { label: 'YouTube', value: prospect.youtube_url, href: prospect.youtube_url },
    { label: 'Gamma Doc', value: prospect.gamma_doc_url, href: prospect.gamma_doc_url },
  ]

  return (
    <div className="fixed top-14 right-0 bottom-0 w-[440px] bg-[#0f0f0f] border-l border-[#1f1f1f] z-30 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between p-6 border-b border-[#1f1f1f] sticky top-0 bg-[#0f0f0f] z-10">
        <div>
          <p className="text-zinc-500 text-xs font-mono mb-1">{prospect.serial}</p>
          <h2 className="text-white font-semibold text-lg leading-tight">
            {prospect.first_name} {prospect.last_name}
          </h2>
          <p className="text-zinc-400 text-sm mt-0.5">{prospect.role_title ?? '—'}</p>
          <p className="text-zinc-500 text-xs mt-0.5">
            {prospect.company ?? '—'}{prospect.place ? ` · ${prospect.place}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => setEditing(!editing)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${
              editing
                ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                : 'border-[#2a2a2a] text-zinc-400 hover:text-white hover:border-zinc-500'
            }`}
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition text-lg leading-none">✕</button>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-6">

        {editing ? (
          /* Edit Mode */
          <>
            <div>
              <p className="text-orange-400 text-xs uppercase tracking-widest mb-3">Identity</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="First Name" value={editForm.first_name} onChange={e => setField('first_name', e.target.value)} />
                <Input label="Last Name" value={editForm.last_name} onChange={e => setField('last_name', e.target.value)} />
                <Input label="Role / Title" value={editForm.role_title} onChange={e => setField('role_title', e.target.value)} />
                <Input label="Company" value={editForm.company} onChange={e => setField('company', e.target.value)} />
                <Input label="Place" value={editForm.place} onChange={e => setField('place', e.target.value)} className="col-span-2" />
              </div>
            </div>

            <div>
              <p className="text-orange-400 text-xs uppercase tracking-widest mb-3">Links</p>
              <div className="flex flex-col gap-3">
                <Input label="Email" value={editForm.email} onChange={e => setField('email', e.target.value)} />
                <Input label="LinkedIn URL" value={editForm.linkedin_url} onChange={e => setField('linkedin_url', e.target.value)} />
                <Input label="Company URL" value={editForm.company_url} onChange={e => setField('company_url', e.target.value)} />
                <Input label="YouTube URL" value={editForm.youtube_url} onChange={e => setField('youtube_url', e.target.value)} />
                <Input label="Gamma Doc URL" value={editForm.gamma_doc_url} onChange={e => setField('gamma_doc_url', e.target.value)} />
              </div>
            </div>

            <div>
              <p className="text-orange-400 text-xs uppercase tracking-widest mb-3">Tags</p>
              <div className="flex flex-wrap gap-2">
                {PROSPECT_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition border ${
                      tags.includes(tag)
                        ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                        : 'bg-[#1a1a1a] border-[#2a2a2a] text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-orange-400 text-xs uppercase tracking-widest mb-3">Notes</p>
              <textarea
                value={editForm.notes}
                onChange={e => setField('notes', e.target.value)}
                rows={4}
                className="w-full bg-[#1a1a1a] text-white rounded-lg px-4 py-2.5 text-sm border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50 placeholder-zinc-600 resize-none transition"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-[#1f1f1f]">
              <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </>
        ) : (
          /* View Mode */
          <>
            {/* Links */}
            <div>
              <p className="text-orange-400 text-xs uppercase tracking-widest mb-3">Links</p>
              <div className="flex flex-col gap-2">
                {links.map(({ label, value, href }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-zinc-500 text-xs w-20">{label}</span>
                    {value ? (
                      <aside
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-400 text-xs hover:text-orange-300 transition truncate max-w-[280px]"
                      >
                        {value}
                      </aside>
                    ) : (
                      <span className="text-zinc-600 text-xs">—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Email Pipeline */}
            <div>
              <p className="text-orange-400 text-xs uppercase tracking-widest mb-3">Email Pipeline</p>
              <div className="flex flex-col gap-3">
                <Dropdown
                  label="Stage"
                  value={email?.stage ?? 'Prospects'}
                  onChange={handleEmailStageChange}
                  options={EMAIL_PIPELINE_STAGES}
                />
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a]">
                    <p className="text-zinc-500 mb-1">Inbox</p>
                    <p className="text-white">{email?.inbox_used ?? '—'}</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a]">
                    <p className="text-zinc-500 mb-1">Sequence</p>
                    <p className="text-white">{email?.sequence_stage ?? '—'}</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a]">
                    <p className="text-zinc-500 mb-1">Emails Sent</p>
                    <p className="text-white">{email?.emails_sent ?? 0}</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a]">
                    <p className="text-zinc-500 mb-1">Last Email</p>
                    <p className="text-white">{formatDate(email?.last_email_date)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* LinkedIn Pipeline */}
            <div>
              <p className="text-orange-400 text-xs uppercase tracking-widest mb-3">LinkedIn Pipeline</p>
              <div className="flex flex-col gap-3">
                <Dropdown
                  label="Connection Status"
                  value={li?.connection_status ?? 'Pending'}
                  onChange={handleLIConnectionChange}
                  options={LINKEDIN_CONNECTION_STATUSES}
                />
                <Dropdown
                  label="DM Status"
                  value={li?.dm_status ?? 'Not Sent'}
                  onChange={handleLIDMChange}
                  options={LINKEDIN_DM_STATUSES}
                />
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a]">
                    <p className="text-zinc-500 mb-1">Follow-ups Sent</p>
                    <p className="text-white">{li?.follow_ups_sent ?? 0}</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a]">
                    <p className="text-zinc-500 mb-1">Call Booked</p>
                    <p className={li?.call_booked ? 'text-green-400' : 'text-zinc-600'}>
                      {li?.call_booked ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a]">
                    <p className="text-zinc-500 mb-1">Onboarded</p>
                    <p className={li?.onboarded ? 'text-green-400' : 'text-zinc-600'}>
                      {li?.onboarded ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a]">
                    <p className="text-zinc-500 mb-1">Last Action</p>
                    <p className="text-white">{formatDate(li?.last_action_date)}</p>
                  </div>
                </div>
                {li?.outcome_notes && (
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a] text-xs">
                    <p className="text-zinc-500 mb-1">Outcome Notes</p>
                    <p className="text-zinc-300">{li.outcome_notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <p className="text-orange-400 text-xs uppercase tracking-widest mb-3">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.length > 0
                  ? tags.map(t => <Badge key={t} label={t} />)
                  : <span className="text-zinc-600 text-xs">No tags</span>}
              </div>
            </div>

            {/* Notes */}
            {prospect.notes && (
              <div>
                <p className="text-orange-400 text-xs uppercase tracking-widest mb-3">Notes</p>
                <p className="text-zinc-300 text-sm leading-relaxed">{prospect.notes}</p>
              </div>
            )}

            {/* Meta */}
            <div className="text-xs text-zinc-600 border-t border-[#1f1f1f] pt-4">
              Added {formatDate(prospect.created_at)} · Updated {formatDate(prospect.updated_at)}
            </div>

            {/* Danger zone */}
            <div className="border-t border-[#1f1f1f] pt-4">
              <Button variant="danger" onClick={handleDelete} className="w-full justify-center">
                Delete Prospect
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
import { useState } from 'react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Dropdown from '../ui/Dropdown'
import Input from '../ui/Input'
import { formatDate } from '../../utils/formatDate'
import { useEmailActivity } from '../../hooks/useEmailActivity'
import { useLinkedinActivity } from '../../hooks/useLinkedinActivity'
import { useActivityLog } from '../../hooks/useActivityLog'

import {
  EMAIL_PIPELINE_STAGES,
  LINKEDIN_CONNECTION_STATUSES,
  LINKEDIN_DM_STATUSES,
  PROSPECT_TAGS
} from '../../utils/constants'

export default function ProspectModal({ prospect, onClose, updateProspect, updateProspectLocal, deleteProspect  }) {
const { logs, loading: logsLoading, addLog } = useActivityLog(prospect.id)
const { updateEmailPipeline } = useEmailActivity(addLog)
const { updateLinkedinPipeline } = useLinkedinActivity(addLog)
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
  const [editTags, setEditTags] = useState(prospect.prospect_tags?.map(t => t.tag) ?? [])
  const [activeTab, setActiveTab] = useState('email')
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const [stageError, setStageError] = useState(null)
  const [connectionError, setConnectionError] = useState(null)
  const [dmError, setDmError] = useState(null)
  const [repliedError, setRepliedError] = useState(null)
  const [saveError, setSaveError] = useState(null)

  if (!prospect) return null

  const email = prospect.email_pipeline?.[0]
  const li = prospect.linkedin_pipeline?.[0]
  const tags = prospect.prospect_tags?.map(t => t.tag) ?? []

  function setField(field, value) {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleTag(tag) {
    setEditTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  function handleToggleEdit() {
    if (!editing) {
      setEditForm({
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
      setEditTags(prospect.prospect_tags?.map(t => t.tag) ?? [])
      setSaveError(null)
    }
    setEditing(prev => !prev)
  }

  async function handleSaveEdit() {
    setSaving(true)
    setSaveError(null)
    const previous = prospect
    const previousTags = tags

    updateProspectLocal(prospect.id, p => ({
      ...p,
      ...editForm,
      prospect_tags: editTags.map(tag => ({ tag })),
    }))

    const { error: updateError } = await updateProspect(prospect.id, editForm)

    let tagsError = null
    if (!updateError) {
      const { supabase } = await import('../../lib/supabase')
      await supabase.from('prospect_tags').delete().eq('prospect_id', prospect.id)
      if (editTags.length > 0) {
        const { error } = await supabase.from('prospect_tags').insert(
          editTags.map(tag => ({ prospect_id: prospect.id, tag }))
        )
        tagsError = error?.message ?? null
      }
    }

    const error = updateError || tagsError
    if (error) {
      updateProspectLocal(prospect.id, () => ({ ...previous, prospect_tags: previousTags.map(tag => ({ tag })) }))
      setSaveError(error)
    } else {
      setEditing(false)
    }
    setSaving(false)
  }

  async function handleEmailStageChange(stage) {
    const previousStage = email?.stage
    setSaving(true)
    setStageError(null)
    updateProspectLocal(prospect.id, p => ({
      ...p,
      email_pipeline: [{ ...(p.email_pipeline?.[0] ?? {}), stage }]
    }))
    const { error } = await updateEmailPipeline(prospect.id, { stage })
    if (error) {
      updateProspectLocal(prospect.id, p => ({
        ...p,
        email_pipeline: [{ ...(p.email_pipeline?.[0] ?? {}), stage: previousStage }]
      }))
      setStageError(error)
    }
    setSaving(false)
  }

  async function handleLIConnectionChange(status) {
    const previousStatus = li?.connection_status
    setSaving(true)
    setConnectionError(null)
    updateProspectLocal(prospect.id, p => ({
      ...p,
      linkedin_pipeline: [{ ...(p.linkedin_pipeline?.[0] ?? {}), connection_status: status }]
    }))
    const { error } = await updateLinkedinPipeline(prospect.id, { connection_status: status })
    if (error) {
      updateProspectLocal(prospect.id, p => ({
        ...p,
        linkedin_pipeline: [{ ...(p.linkedin_pipeline?.[0] ?? {}), connection_status: previousStatus }]
      }))
      setConnectionError(error)
    }
    setSaving(false)
  }

  async function handleLIDMChange(status) {
    const previousStatus = li?.dm_status
    setSaving(true)
    setDmError(null)
    updateProspectLocal(prospect.id, p => ({
      ...p,
      linkedin_pipeline: [{ ...(p.linkedin_pipeline?.[0] ?? {}), dm_status: status }]
    }))
    const { error } = await updateLinkedinPipeline(prospect.id, { dm_status: status })
    if (error) {
      updateProspectLocal(prospect.id, p => ({
        ...p,
        linkedin_pipeline: [{ ...(p.linkedin_pipeline?.[0] ?? {}), dm_status: previousStatus }]
      }))
      setDmError(error)
    }
    setSaving(false)
  }

  async function handleAddNote() {
  if (!newNote.trim()) return
  setSavingNote(true)
  await addLog(activeTab, 'Note added', newNote.trim())
  setNewNote('')
  setSavingNote(false)
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
            onClick={handleToggleEdit}
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
                      editTags.includes(tag)
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

            {saveError && <p className="text-red-400 text-xs">{saveError}</p>}

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
    <div key={label} className="flex flex-col gap-1 bg-[#141414] border border-[#222] rounded-xl px-4 py-3">
      <span className="text-zinc-500 text-[10px] uppercase tracking-widest">{label}</span>
      {value ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-orange-400 text-sm hover:text-orange-300 transition break-all leading-snug"
        >
          {value}
        </a>
      ) : (
        <span className="text-zinc-600 text-sm">—</span>
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
                {stageError && <p className="text-red-400 text-xs">{stageError}</p>}
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
                <div className="flex items-center justify-between bg-[#1a1a1a] rounded-lg px-3 py-2.5 border border-[#2a2a2a]">
  <span className="text-zinc-500 text-xs">Replied</span>
  <button
    onClick={async () => {
      const previousReplied = email?.replied
      const nextReplied = !previousReplied
      setSaving(true)
      setRepliedError(null)
      updateProspectLocal(prospect.id, p => ({
        ...p,
        email_pipeline: [{ ...(p.email_pipeline?.[0] ?? {}), replied: nextReplied }]
      }))
      const { error } = await updateEmailPipeline(prospect.id, { replied: nextReplied })
      if (error) {
        updateProspectLocal(prospect.id, p => ({
          ...p,
          email_pipeline: [{ ...(p.email_pipeline?.[0] ?? {}), replied: previousReplied }]
        }))
        setRepliedError(error)
      }
      setSaving(false)
    }}
    className={`relative w-9 h-5 rounded-full transition-colors ${
      email?.replied ? 'bg-orange-500' : 'bg-[#2a2a2a]'
    }`}
  >
    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
      email?.replied ? 'translate-x-4' : 'translate-x-0'
    }`} />
  </button>
</div>
{repliedError && <p className="text-red-400 text-xs">{repliedError}</p>}
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
                {connectionError && <p className="text-red-400 text-xs">{connectionError}</p>}
                <Dropdown
                  label="DM Status"
                  value={li?.dm_status ?? 'Not Sent'}
                  onChange={handleLIDMChange}
                  options={LINKEDIN_DM_STATUSES}
                />
                {dmError && <p className="text-red-400 text-xs">{dmError}</p>}
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
            {/* Activity Log */}
<div>
  <p className="text-orange-400 text-xs uppercase tracking-widest mb-3">Activity Log</p>

  {/* Tabs */}
  <div className="flex items-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-1 gap-1 mb-4">
    <button
      onClick={() => setActiveTab('email')}
      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
        activeTab === 'email'
          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
          : 'text-zinc-500 hover:text-white'
      }`}
    >
      ✉️ Email
    </button>
    <button
      onClick={() => setActiveTab('linkedin')}
      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
        activeTab === 'linkedin'
          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
          : 'text-zinc-500 hover:text-white'
      }`}
    >
      🔗 LinkedIn
    </button>
  </div>

  {/* Note input */}
  <div className="flex gap-2 mb-4">
    <input
      type="text"
      value={newNote}
      onChange={e => setNewNote(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && handleAddNote()}
      placeholder={`Add a ${activeTab} note...`}
      className="flex-1 bg-[#1a1a1a] text-white text-xs rounded-lg px-3 py-2 border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50 placeholder-zinc-600 transition"
    />
    <button
      onClick={handleAddNote}
      disabled={savingNote || !newNote.trim()}
      className="px-3 py-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-medium hover:bg-orange-500/30 transition disabled:opacity-40"
    >
      {savingNote ? '...' : 'Add'}
    </button>
  </div>

  {/* Log entries */}
  {logsLoading ? (
    <div className="flex justify-center py-6">
      <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ) : (
    <div className="flex flex-col gap-2">
      {logs.filter(l => l.type === activeTab).length === 0 ? (
        <p className="text-zinc-600 text-xs text-center py-4">No {activeTab} activity yet.</p>
      ) : (
        logs
          .filter(l => l.type === activeTab)
          .map(log => (
            <div key={log.id} className="bg-[#1a1a1a] rounded-lg px-3 py-2.5 border border-[#2a2a2a]">
              <p className="text-zinc-300 text-xs">{log.action}</p>
              {log.note && (
                <p className="text-zinc-500 text-xs mt-1 italic">"{log.note}"</p>
              )}
              <p className="text-zinc-600 text-xs mt-1.5">
                {new Date(log.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          ))
      )}
    </div>
  )}
</div>
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
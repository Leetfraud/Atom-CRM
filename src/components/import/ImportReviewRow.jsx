import { useState } from 'react'
import Input from '../ui/Input'
import Dropdown from '../ui/Dropdown'
import Badge from '../ui/Badge'
import {
  EMAIL_PIPELINE_STAGES,
  LINKEDIN_CONNECTION_STATUSES,
  LINKEDIN_DM_STATUSES,
  PROSPECT_TAGS,
} from '../../utils/constants'

const sourceBadge = {
  matched: { label: 'Matched', cls: 'bg-green-900 text-green-300' },
  linkedin: { label: 'LinkedIn only', cls: 'bg-blue-900 text-blue-300' },
  email: { label: 'Email only', cls: 'bg-purple-900 text-purple-300' },
}

// One review row: a collapsed summary line plus an expandable editor that
// exposes every field (reusing Input/Dropdown), tag toggles, and notes.
export default function ImportReviewRow({ row, onChange, onToggleInclude }) {
  const [open, setOpen] = useState(false)
  const src = sourceBadge[row.source] ?? sourceBadge.linkedin

  function set(field, value) {
    onChange(row.id, { [field]: value })
  }

  function toggleTag(tag) {
    const tags = row.tags.includes(tag)
      ? row.tags.filter(t => t !== tag)
      : [...row.tags, tag]
    onChange(row.id, { tags })
  }

  return (
    <div className={`border-b border-[#1a1a1a] ${row.included ? '' : 'opacity-40'}`}>
      {/* Summary line */}
      <div className="flex items-center gap-3 px-4 py-2.5 text-sm">
        <input
          type="checkbox"
          checked={row.included}
          onChange={() => onToggleInclude(row.id)}
          className="accent-orange-500 w-4 h-4 shrink-0"
        />
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${src.cls}`}>
          {src.label}
        </span>
        <span className="text-white w-40 truncate shrink-0">
          {`${row.first_name} ${row.last_name}`.trim() || <span className="text-zinc-600">—</span>}
        </span>
        <span className="text-zinc-400 w-40 truncate shrink-0">{row.company || '—'}</span>
        <span className="text-zinc-500 flex-1 truncate">{row.email || '—'}</span>
        {row.email_stage && <Badge label={row.email_stage} />}
        <button
          onClick={() => setOpen(o => !o)}
          className="text-orange-400 hover:text-orange-300 text-xs uppercase tracking-widest shrink-0"
        >
          {open ? 'Close' : 'Edit'}
        </button>
      </div>

      {/* Editor */}
      {open && (
        <div className="px-4 pb-5 pt-1 bg-[#0d0d0d]">
          <div className="grid grid-cols-3 gap-3">
            <Input label="First Name" value={row.first_name} onChange={e => set('first_name', e.target.value)} />
            <Input label="Last Name" value={row.last_name} onChange={e => set('last_name', e.target.value)} />
            <Input label="Serial" value={row.serial} onChange={e => set('serial', e.target.value)} placeholder="auto" />
            <Input label="Company" value={row.company} onChange={e => set('company', e.target.value)} />
            <Input label="Role / Title" value={row.role_title} onChange={e => set('role_title', e.target.value)} />
            <Input label="Place" value={row.place} onChange={e => set('place', e.target.value)} />
            <Input label="Email" value={row.email} onChange={e => set('email', e.target.value)} />
            <Input label="LinkedIn URL" value={row.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} />
            <Input label="Company URL" value={row.company_url} onChange={e => set('company_url', e.target.value)} />
            <Input label="Gamma Doc URL" value={row.gamma_doc_url} onChange={e => set('gamma_doc_url', e.target.value)} />
            <Input label="YouTube URL" value={row.youtube_url} onChange={e => set('youtube_url', e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3">
            <Dropdown label="Email Stage" value={row.email_stage} onChange={v => set('email_stage', v)} options={EMAIL_PIPELINE_STAGES} />
            <Dropdown label="LI Connection" value={row.connection_status} onChange={v => set('connection_status', v)} options={LINKEDIN_CONNECTION_STATUSES} />
            <Dropdown label="LI DM Status" value={row.dm_status} onChange={v => set('dm_status', v)} options={LINKEDIN_DM_STATUSES} />
          </div>

          <div className="mt-4">
            <p className="text-zinc-400 text-xs uppercase tracking-widest mb-2">Tags</p>
            <div className="flex flex-wrap gap-2">
              {PROSPECT_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition border ${
                    row.tags.includes(tag)
                      ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                      : 'bg-[#1a1a1a] border-[#2a2a2a] text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-zinc-400 text-xs uppercase tracking-widest mb-2">Notes</p>
            <textarea
              value={row.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className="w-full bg-[#1a1a1a] text-white rounded-lg px-4 py-2.5 text-sm border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50 placeholder-zinc-600 resize-none transition"
            />
          </div>
        </div>
      )}
    </div>
  )
}

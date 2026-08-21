import { useState } from 'react'
import Input from '../ui/Input'
import Dropdown from '../ui/Dropdown'
import Badge from '../ui/Badge'
import { useTags } from '../../hooks/useTags'
import {
  EMAIL_PIPELINE_STAGES,
  LINKEDIN_CONNECTION_STATUSES,
  LINKEDIN_DM_STATUSES
} from '../../utils/constants'


const sourceBadge = {
  matched: { label: 'Matched', cls: 'bg-mint-dim text-mint' },
  linkedin: { label: 'LinkedIn only', cls: 'bg-accent-dim text-accent' },
  email: { label: 'Email only', cls: 'bg-card text-paper-dim' },
}

// One review row: a collapsed summary line plus an expandable editor that
// exposes every field (reusing Input/Dropdown), tag toggles, and notes.
export default function ImportReviewRow({ row, onChange, onToggleInclude }) {
  const { tags: availableTags } = useTags()
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
    <div className={`border-b border-line/60 ${row.included ? '' : 'opacity-40'}`}>
      {/* Summary line */}
      <div className="flex items-center gap-3 px-4 py-2.5 text-sm">
        <input
          type="checkbox"
          checked={row.included}
          onChange={() => onToggleInclude(row.id)}
          className="accent-accent w-4 h-4 shrink-0"
        />
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10.5px] shrink-0 ${src.cls}`}>
          {src.label}
        </span>
        {row._existingId && (
          <span
            title="Already imported from Notion — this will update the existing prospect, not add a second one. Its notes in Atom are left alone."
            className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10.5px] shrink-0 bg-card text-paper-dim border border-line"
          >
            ↻ Update
          </span>
        )}
        {row.needsName && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10.5px] shrink-0 bg-down-dim text-down border border-down/30">
            ⚠ Needs manual entry
          </span>
        )}
        <span className="text-paper w-40 truncate shrink-0">
          {`${row.first_name} ${row.last_name}`.trim() || <span className="text-fog">—</span>}
        </span>
        <span className="text-paper-dim w-40 truncate shrink-0">{row.company || '—'}</span>
        <span className="text-fog flex-1 truncate">{row.email || '—'}</span>
        {row.email_stage && <Badge label={row.email_stage} />}
        <button
          onClick={() => setOpen(o => !o)}
          className="font-mono text-accent hover:text-paper text-[11px] uppercase tracking-wide shrink-0"
        >
          {open ? 'Close' : 'Edit'}
        </button>
      </div>

      {/* Editor */}
      {open && (
        <div className="px-4 pb-5 pt-1 bg-card">
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
            <p className="font-mono text-fog text-[10px] uppercase tracking-wide mb-2">Tags</p>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full font-mono text-[11px] transition border ${
                    row.tags.includes(tag)
                      ? 'bg-accent-dim border-accent/40 text-accent'
                      : 'bg-card-2 border-line text-paper-dim hover:border-paper-dim'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="font-mono text-fog text-[10px] uppercase tracking-wide mb-2">Notes</p>
            {row._existingId && (
              <p className="text-fog text-[11px] mb-2">
                Not written on an update — this prospect keeps the notes it already has in Atom.
              </p>
            )}
            <textarea
              value={row.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className="w-full bg-card-2 text-paper rounded-xl px-4 py-2.5 text-sm border border-line focus:outline-none focus:border-accent/50 placeholder-fog resize-none transition"
            />
          </div>
        </div>
      )}
    </div>
  )
}

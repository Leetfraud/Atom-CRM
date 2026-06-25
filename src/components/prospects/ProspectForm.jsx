import { useState } from 'react'
import Input from '../ui/Input'
import Dropdown from '../ui/Dropdown'
import Button from '../ui/Button'
import {
  EMAIL_PIPELINE_STAGES,
  LINKEDIN_CONNECTION_STATUSES,
  LINKEDIN_DM_STATUSES,
  PROSPECT_TAGS
} from '../../utils/constants'

const emptyForm = {
  first_name: '',
  last_name: '',
  company: '',
  role_title: '',
  email: '',
  linkedin_url: '',
  company_url: '',
  gamma_doc_url: '',
  youtube_url: '',
  place: '',
  notes: '',
  email_stage: 'Prospects',
  connection_status: 'Pending',
  dm_status: 'Not Sent',
  tags: [],
}

function parseSmartPaste(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const result = {}
  const unmatched = []

  for (let line of lines) {
    // Strip common prefixes
    line = line.replace(/^(linkedin|gamma|youtube|email|company|url|website|name|role|title)\s*:\s*/i, '').trim()

    // Email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line)) {
      result.email = line
      continue
    }
    // LinkedIn URL
    if (/linkedin\.com/i.test(line)) {
      result.linkedin_url = line
      continue
    }
    // YouTube URL
    if (/youtube\.com|youtu\.be/i.test(line)) {
      result.youtube_url = line
      continue
    }
    // Gamma doc URL
    if (/gamma\.app/i.test(line)) {
      result.gamma_doc_url = line
      continue
    }
    // Generic URL
    if (/^https?:\/\//i.test(line) || /^www\./i.test(line)) {
      if (!result.company_url) result.company_url = line
      else unmatched.push(line)
      continue
    }
    // Role/title with colon — split role from name
    if (/founder|ceo|cto|coo|director|manager|head|vp|president|owner|partner|co-founder|cofounder/i.test(line)) {
      if (line.includes(':')) {
        const [rolepart, namepart] = line.split(':').map(s => s.trim())
        if (!result.role_title) result.role_title = rolepart
        if (namepart && !result.first_name) {
          const parts = namepart.split(' ').filter(Boolean)
          result.first_name = parts[0] ?? ''
          result.last_name = parts.slice(1).join(' ')
        }
      } else {
        if (!result.role_title) result.role_title = line
        else unmatched.push(line)
      }
      continue
    }
    // Name — two or more capitalized words
    if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)+$/.test(line) && !result.first_name) {
      const parts = line.split(' ')
      result.first_name = parts[0]
      result.last_name = parts.slice(1).join(' ')
      continue
    }
    // Company
    if (!result.company && line.length < 60 && !/[/@]/.test(line)) {
      result.company = line
      continue
    }
    // Anything else goes to notes
    unmatched.push(line)
  }

  if (unmatched.length > 0) {
    result.notes = unmatched.join('\n')
  }

  return result
}

export default function ProspectForm({ onSubmit, onCancel, loading, generateSerial }) {
  const [form, setForm] = useState(emptyForm)
  const [pasteText, setPasteText] = useState('')
  const [showPaste, setShowPaste] = useState(false)

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleTag(tag) {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }))
  }

  function handleParse() {
    const parsed = parseSmartPaste(pasteText)
    setForm(prev => ({ ...prev, ...parsed }))
    setShowPaste(false)
    setPasteText('')
  }

  async function handleSubmit() {
    if (!form.first_name) return
    const serial = await generateSerial()
    onSubmit({
      serial,
      first_name: form.first_name,
      last_name: form.last_name,
      company: form.company,
      role_title: form.role_title,
      email: form.email,
      linkedin_url: form.linkedin_url,
      company_url: form.company_url,
      gamma_doc_url: form.gamma_doc_url,
      youtube_url: form.youtube_url,
      place: form.place,
      notes: form.notes,
      tags: form.tags,
      email_pipeline: { stage: form.email_stage },
      linkedin_pipeline: {
        connection_status: form.connection_status,
        dm_status: form.dm_status,
        connection_sent_at: new Date().toISOString(),
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Smart Paste Toggle */}
      <div>
        <button
          onClick={() => setShowPaste(!showPaste)}
          className="text-orange-400 text-xs uppercase tracking-widest hover:text-orange-300 transition"
        >
          {showPaste ? '— Hide smart paste' : '+ Smart paste'}
        </button>

        {showPaste && (
          <div className="mt-3 flex flex-col gap-2">
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder={`Paste prospect info here — name, email, LinkedIn, company URL, role...\n\nExample:\nJohn Smith\nFounder & CEO\nAcme Inc.\nlinkedin.com/in/johnsmith\nacme.com\njohn@acme.com`}
              rows={7}
              className="w-full bg-[#1a1a1a] text-white rounded-lg px-4 py-2.5 text-sm border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50 placeholder-zinc-600 resize-none transition"
            />
            <Button onClick={handleParse} disabled={!pasteText.trim()} className="self-start">
              Parse into fields
            </Button>
          </div>
        )}
      </div>

      {/* Identity */}
      <div>
        <p className="text-orange-400 text-xs uppercase tracking-widest mb-3">Identity</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="First Name *" value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="John" />
          <Input label="Last Name" value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Smith" />
          <Input label="Role / Title" value={form.role_title} onChange={e => set('role_title', e.target.value)} placeholder="Founder & CEO" />
          <Input label="Company" value={form.company} onChange={e => set('company', e.target.value)} placeholder="Acme Inc." />
          <Input label="Place" value={form.place} onChange={e => set('place', e.target.value)} placeholder="London, UK" className="col-span-2" />
        </div>
      </div>

      {/* Links */}
      <div>
        <p className="text-orange-400 text-xs uppercase tracking-widest mb-3">Links</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@acme.com" />
          <Input label="LinkedIn URL" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} placeholder="linkedin.com/in/john" />
          <Input label="Company URL" value={form.company_url} onChange={e => set('company_url', e.target.value)} placeholder="acme.com" />
          <Input label="YouTube URL" value={form.youtube_url} onChange={e => set('youtube_url', e.target.value)} placeholder="youtube.com/@acme" />
          <Input label="Gamma Doc URL" value={form.gamma_doc_url} onChange={e => set('gamma_doc_url', e.target.value)} placeholder="gamma.app/docs/..." className="col-span-2" />
        </div>
      </div>

      {/* Pipeline */}
      <div>
        <p className="text-orange-400 text-xs uppercase tracking-widest mb-3">Pipeline</p>
        <div className="grid grid-cols-3 gap-3">
          <Dropdown label="Email Stage" value={form.email_stage} onChange={v => set('email_stage', v)} options={EMAIL_PIPELINE_STAGES} />
          <Dropdown label="LI Connection" value={form.connection_status} onChange={v => set('connection_status', v)} options={LINKEDIN_CONNECTION_STATUSES} />
          <Dropdown label="LI DM Status" value={form.dm_status} onChange={v => set('dm_status', v)} options={LINKEDIN_DM_STATUSES} />
        </div>
      </div>

      {/* Tags */}
      <div>
        <p className="text-orange-400 text-xs uppercase tracking-widest mb-3">Tags</p>
        <div className="flex flex-wrap gap-2">
          {PROSPECT_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition border ${
                form.tags.includes(tag)
                  ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                  : 'bg-[#1a1a1a] border-[#2a2a2a] text-zinc-400 hover:border-zinc-500'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <p className="text-orange-400 text-xs uppercase tracking-widest mb-3">Notes</p>
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Any additional context..."
          rows={3}
          className="w-full bg-[#1a1a1a] text-white rounded-lg px-4 py-2.5 text-sm border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50 placeholder-zinc-600 resize-none transition"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-[#1f1f1f]">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={loading || !form.first_name}>
          {loading ? 'Adding...' : 'Add Prospect'}
        </Button>
      </div>
    </div>
  )
}
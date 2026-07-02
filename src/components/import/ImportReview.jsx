import { useMemo, useState } from 'react'
import Button from '../ui/Button'
import ImportReviewRow from './ImportReviewRow'
import { summarize } from '../../utils/importParsers'

const SOURCE_FILTERS = [
  { value: 'all', label: 'All sources' },
  { value: 'matched', label: 'Matched' },
  { value: 'linkedin', label: 'LinkedIn only' },
  { value: 'email', label: 'Email only' },
]

export default function ImportReview({
  rows,
  onChange,
  onToggleInclude,
  onSetAllIncluded,
  onRepair,
  onCommit,
  onBack,
  committing,
  progress,
}) {
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [showRepair, setShowRepair] = useState(false)
  const [pairLi, setPairLi] = useState('')
  const [pairEmail, setPairEmail] = useState('')

  const summary = useMemo(() => summarize(rows), [rows])

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim()
    return rows.filter(r => {
      if (sourceFilter !== 'all' && r.source !== sourceFilter) return false
      if (!q) return true
      return (
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
        (r.company ?? '').toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q)
      )
    })
  }, [rows, search, sourceFilter])

  const liOnly = useMemo(() => rows.filter(r => r.source === 'linkedin'), [rows])
  const emailOnly = useMemo(() => rows.filter(r => r.source === 'email'), [rows])

  function handlePair() {
    if (pairLi && pairEmail) {
      onRepair(pairLi, pairEmail)
      setPairLi('')
      setPairEmail('')
    }
  }

  const rowLabel = r => `${`${r.first_name} ${r.last_name}`.trim() || '(no name)'}${r.company ? ` — ${r.company}` : ''}`

  return (
    <div className="flex flex-col gap-4">
      {/* Summary + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-zinc-300 text-sm">
          <span className="text-green-400 font-medium">{summary.matched}</span> matched,{' '}
          <span className="text-blue-400 font-medium">{summary.linkedin}</span> LinkedIn-only,{' '}
          <span className="text-purple-400 font-medium">{summary.email}</span> Email-only —{' '}
          <span className="text-white font-medium">{summary.total}</span> total to import
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onBack} disabled={committing}>Back</Button>
          <Button onClick={onCommit} disabled={committing || summary.total === 0}>
            {committing
              ? `Importing ${progress.done} / ${progress.total}…`
              : `Import ${summary.total}`}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, company, email…"
          className="bg-[#1a1a1a] text-white rounded-lg px-4 py-2 text-sm border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50 placeholder-zinc-600 w-64"
        />
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="bg-[#1a1a1a] text-white rounded-lg px-3 py-2 text-sm border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50"
        >
          {SOURCE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <button onClick={() => onSetAllIncluded(true)} className="text-zinc-400 hover:text-white text-xs uppercase tracking-widest">Select all</button>
        <button onClick={() => onSetAllIncluded(false)} className="text-zinc-400 hover:text-white text-xs uppercase tracking-widest">Deselect all</button>
        <button
          onClick={() => setShowRepair(s => !s)}
          className="text-orange-400 hover:text-orange-300 text-xs uppercase tracking-widest ml-auto"
        >
          {showRepair ? '— Hide re-pair' : '+ Re-pair unmatched'}
        </button>
      </div>

      {/* Re-pair panel */}
      {showRepair && (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4 flex flex-col gap-3">
          <p className="text-zinc-500 text-xs">
            Pair a LinkedIn-only row with an Email-only row the auto-matcher missed (e.g. a name spelling difference). The email data merges into the LinkedIn row.
          </p>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-400 text-xs uppercase tracking-widest">LinkedIn-only ({liOnly.length})</label>
              <select
                value={pairLi}
                onChange={e => setPairLi(e.target.value)}
                className="bg-[#1a1a1a] text-white rounded-lg px-3 py-2 text-sm border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50 w-72"
              >
                <option value="">Select…</option>
                {liOnly.map(r => <option key={r.id} value={r.id}>{rowLabel(r)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-400 text-xs uppercase tracking-widest">Email-only ({emailOnly.length})</label>
              <select
                value={pairEmail}
                onChange={e => setPairEmail(e.target.value)}
                className="bg-[#1a1a1a] text-white rounded-lg px-3 py-2 text-sm border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50 w-72"
              >
                <option value="">Select…</option>
                {emailOnly.map(r => <option key={r.id} value={r.id}>{rowLabel(r)}</option>)}
              </select>
            </div>
            <Button onClick={handlePair} disabled={!pairLi || !pairEmail}>Pair</Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl overflow-hidden">
        {visible.length === 0 ? (
          <p className="text-zinc-600 text-sm p-6 text-center">No rows match the current filter.</p>
        ) : (
          visible.map(row => (
            <ImportReviewRow
              key={row.id}
              row={row}
              onChange={onChange}
              onToggleInclude={onToggleInclude}
            />
          ))
        )}
      </div>
    </div>
  )
}

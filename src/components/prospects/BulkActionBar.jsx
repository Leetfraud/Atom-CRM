import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const MARGIN = 8

// Floating panel anchored to a right-click. `position` carries viewport
// coordinates (clientX/clientY), so the panel is position:fixed — with
// position:absolute it would drift by the scroll offset on a scrolled page.
export default function BulkActionBar({
  count,
  pipelineMode,
  stageOptions,
  tagOptions,
  tagStates,
  onSetStatus,
  onToggleTag,
  onClear,
  applying,
  position,
  error,
}) {
  const panelRef = useRef(null)
  const [coords, setCoords] = useState({ left: position.x, top: position.y })

  // Measure once mounted and flip the panel back over the cursor if it would
  // overflow. useLayoutEffect so the correction lands before paint.
  useLayoutEffect(() => {
    const el = panelRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()

    let left = position.x
    let top = position.y
    if (left + width + MARGIN > window.innerWidth) {
      left = Math.max(MARGIN, position.x - width)
    }
    if (top + height + MARGIN > window.innerHeight) {
      top = Math.max(MARGIN, position.y - height)
    }
    setCoords({ left, top })
  }, [position.x, position.y])

  useEffect(() => {
    function handlePointerDown(e) {
      // Right-clicks are the table's own context-menu gesture — letting them
      // close the panel here would wipe the selection a moment before the row
      // handler rebuilds it.
      if (e.button === 2) return
      if (panelRef.current && !panelRef.current.contains(e.target)) onClear()
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClear()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClear])

  const statusLabel = pipelineMode === 'email' ? 'Email Stage' : 'LinkedIn DM Status'

  return (
    <div
      ref={panelRef}
      style={{ left: coords.left, top: coords.top, borderRadius: 22 }}
      className={`fixed z-50 w-64 bg-card border border-line shadow-2xl overflow-hidden transition-opacity ${
        applying ? 'opacity-60' : 'opacity-100'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line">
        <span className="font-mono text-[10px] uppercase tracking-wide text-fog">
          {count} selected
        </span>
        <button
          onClick={onClear}
          className="font-mono text-[10px] uppercase tracking-wide text-paper-dim hover:text-paper transition"
        >
          Clear
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[10px] uppercase tracking-wide text-fog">
            {statusLabel}
          </label>
          <select
            value=""
            disabled={applying}
            onChange={e => { if (e.target.value) onSetStatus(e.target.value) }}
            className="bg-card-2 text-paper rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-accent/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Set status…</option>
            {stageOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[10px] uppercase tracking-wide text-fog">Tags</label>
          <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5 -mx-1 px-1">
            {tagOptions.map(tag => {
              const state = tagStates[tag] ?? 'none'
              return (
                <label
                  key={tag}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition ${
                    applying ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-card-2'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={state === 'all'}
                    disabled={applying}
                    // `indeterminate` is a DOM property with no HTML attribute,
                    // so it has to be set on the node itself. A callback ref
                    // re-runs each render and keeps it in sync.
                    ref={el => { if (el) el.indeterminate = state === 'some' }}
                    onChange={e => onToggleTag(tag, e.target.checked)}
                    className="accent-accent w-3.5 h-3.5 shrink-0"
                  />
                  <span className={state === 'none' ? 'text-paper-dim' : 'text-paper'}>
                    {tag}
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        {error && (
          <p className="text-down text-xs bg-down-dim border border-down/30 rounded-xl px-3 py-2 break-words">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

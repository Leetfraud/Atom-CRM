import { useEffect, useRef, useState } from 'react'

const COLUMNS = ['Date', 'Emails Sent', 'Replies', 'LI DMs', 'Docs Opened', 'Calls Booked', 'Closes', 'Cash (USD)', 'Revenue']

const FIELDS = [
  ['emails_sent', false],
  ['replies', false],
  ['linkedin_dms', false],
  ['docs_opened', false],
  ['calls_booked', false],
  ['closes', false],
  ['cash_collected_usd', true],
  ['revenue', true],
]

// Removes the native number-input spinner arrows so the cell reads as a plain spreadsheet cell.
const CELL_CLASS =
  'w-20 bg-transparent text-paper text-sm px-2 py-1 rounded-lg border border-transparent hover:border-line focus:border-accent/50 focus:bg-card-2 focus:outline-none transition text-center font-mono ' +
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0'

/**
 * Holds its own draft while focused, then follows `value` again once the user
 * leaves. That keeps typing untouched by the optimistic write it triggers, and
 * still puts the old number back on screen if that write is rolled back.
 */
function StatCell({ value, isDecimal, inputRef, onKeyDown, onCommit }) {
  const [draft, setDraft] = useState(String(value))
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) setDraft(String(value))
  }, [value])

  return (
    <input
      ref={inputRef}
      type="number"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onFocus={e => { focusedRef.current = true; e.target.select() }}
      onKeyDown={onKeyDown}
      onBlur={() => {
        focusedRef.current = false
        // Normalise before comparing so "007" or "" settle back to the value
        // already on screen instead of firing a write that changes nothing.
        const normalized = String(isDecimal ? parseFloat(draft) || 0 : parseInt(draft, 10) || 0)
        setDraft(normalized)
        if (normalized !== String(value)) onCommit(normalized)
      }}
      step={isDecimal ? '0.01' : '1'}
      min="0"
      className={CELL_CLASS}
    />
  )
}

export default function MonthlyStatsTable({ allDays, dailyStats, monthlyTotals, loading, onCellEdit }) {
  const cellRefs = useRef({})

  function focusCell(rowIdx, colIdx) {
    const el = cellRefs.current[`${rowIdx}-${colIdx}`]
    if (el) {
      el.focus()
      el.select()
    }
  }

  function handleKeyDown(e, rowIdx, colIdx) {
    const lastRow = allDays.length - 1
    const lastCol = FIELDS.length - 1

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        if (rowIdx > 0) focusCell(rowIdx - 1, colIdx)
        break
      case 'ArrowDown':
        e.preventDefault()
        if (rowIdx < lastRow) focusCell(rowIdx + 1, colIdx)
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (colIdx > 0) focusCell(rowIdx, colIdx - 1)
        break
      case 'ArrowRight':
        e.preventDefault()
        if (colIdx < lastCol) focusCell(rowIdx, colIdx + 1)
        break
      case 'Enter':
        e.preventDefault()
        if (rowIdx < lastRow) focusCell(rowIdx + 1, colIdx)
        else e.target.blur()
        break
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line">
            {COLUMNS.map(col => (
              <th key={col} className="text-left font-mono text-[10.5px] text-fog uppercase tracking-wide font-medium px-4 py-3 whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allDays.map((date, rowIdx) => {
            const row = dailyStats.find(s => s.date === date) ?? {}
            const isToday = date === new Date().toISOString().split('T')[0]
            return (
              <tr
                key={date}
                className={`border-b border-line/60 ${isToday ? 'bg-mint-dim' : 'hover:bg-card-2'}`}
              >
                <td className="px-4 py-2 text-paper-dim text-xs whitespace-nowrap font-medium">
                  {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  {isToday && <span className="ml-2 font-mono text-mint text-[9.5px]">today</span>}
                </td>
                {FIELDS.map(([field, isDecimal], colIdx) => (
                  <td key={field} className="px-2 py-1">
                    <StatCell
                      value={row[field] ?? 0}
                      isDecimal={isDecimal}
                      inputRef={el => { cellRefs.current[`${rowIdx}-${colIdx}`] = el }}
                      onKeyDown={e => handleKeyDown(e, rowIdx, colIdx)}
                      onCommit={val => onCellEdit(date, field, val)}
                    />
                  </td>
                ))}
              </tr>
            )
          })}

          {/* Totals row */}
          <tr className="border-t-2 border-line bg-card-2">
            <td className="px-4 py-3 text-paper font-mono text-xs font-bold uppercase tracking-wide">
              Total
            </td>
            {[
              monthlyTotals?.emails_sent ?? 0,
              monthlyTotals?.replies ?? 0,
              monthlyTotals?.linkedin_dms ?? 0,
              monthlyTotals?.docs_opened ?? 0,
              monthlyTotals?.calls_booked ?? 0,
              monthlyTotals?.closes ?? 0,
              `$${(monthlyTotals?.cash_collected_usd ?? 0).toLocaleString()}`,
              `$${(monthlyTotals?.revenue ?? 0).toLocaleString()}`,
            ].map((val, i) => (
              <td key={i} className="px-4 py-3 text-paper font-display font-semibold text-sm text-center">
                {val}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

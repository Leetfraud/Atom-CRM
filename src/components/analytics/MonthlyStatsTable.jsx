import { useRef } from 'react'

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
  'w-20 bg-transparent text-white text-sm px-2 py-1 rounded border border-transparent hover:border-[#2a2a2a] focus:border-orange-500/50 focus:bg-[#1a1a1a] focus:outline-none transition text-center ' +
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0'

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
        <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#1f1f1f]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1f1f1f]">
            {COLUMNS.map(col => (
              <th key={col} className="text-left text-xs text-zinc-500 uppercase tracking-widest font-medium px-4 py-3 whitespace-nowrap">
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
                className={`border-b border-[#141414] ${isToday ? 'bg-orange-500/5' : 'hover:bg-[#111111]'}`}
              >
                <td className="px-4 py-2 text-zinc-400 text-xs whitespace-nowrap font-medium">
                  {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  {isToday && <span className="ml-2 text-orange-500 text-xs">today</span>}
                </td>
                {FIELDS.map(([field, isDecimal], colIdx) => (
                  <td key={field} className="px-2 py-1">
                    <input
                      ref={el => { cellRefs.current[`${rowIdx}-${colIdx}`] = el }}
                      type="number"
                      defaultValue={row[field] ?? 0}
                      onFocus={e => e.target.select()}
                      onKeyDown={e => handleKeyDown(e, rowIdx, colIdx)}
                      onBlur={e => {
                        const val = e.target.value
                        const original = String(row[field] ?? 0)
                        if (val !== original) onCellEdit(date, field, val)
                      }}
                      step={isDecimal ? '0.01' : '1'}
                      min="0"
                      className={CELL_CLASS}
                    />
                  </td>
                ))}
              </tr>
            )
          })}

          {/* Totals row */}
          <tr className="border-t-2 border-[#2a2a2a] bg-[#111111]">
            <td className="px-4 py-3 text-orange-400 text-xs font-bold uppercase tracking-widest">
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
              <td key={i} className="px-4 py-3 text-white font-semibold text-sm text-center">
                {val}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

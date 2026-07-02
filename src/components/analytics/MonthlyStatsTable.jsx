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

export default function MonthlyStatsTable({ allDays, dailyStats, monthlyTotals, loading, onCellEdit }) {
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
          {allDays.map(date => {
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
                {FIELDS.map(([field, isDecimal]) => (
                  <td key={field} className="px-2 py-1">
                    <input
                      type="number"
                      defaultValue={row[field] ?? 0}
                      onBlur={e => {
                        const val = e.target.value
                        const original = String(row[field] ?? 0)
                        if (val !== original) onCellEdit(date, field, val)
                      }}
                      step={isDecimal ? '0.01' : '1'}
                      min="0"
                      className="w-20 bg-transparent text-white text-sm px-2 py-1 rounded border border-transparent hover:border-[#2a2a2a] focus:border-orange-500/50 focus:bg-[#1a1a1a] focus:outline-none transition text-center"
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

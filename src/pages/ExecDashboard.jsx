import { useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'
import StatCard from '../components/ui/StatCard'
import { useDailyStats } from '../hooks/useDailyStats'
import { getCurrentMonth, formatMonth } from '../utils/formatDate'

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date()
  d.setMonth(d.getMonth() - i)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})

export default function ExecDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [pkrRate, setPkrRate] = useState(278)
  const [editingRate, setEditingRate] = useState(false)
  const { dailyStats, monthlyTotals, replyRate, closeRate, upsertDailyStat, loading } = useDailyStats(selectedMonth)

  const daysInMonth = new Date(
    parseInt(selectedMonth.split('-')[0]),
    parseInt(selectedMonth.split('-')[1]),
    0
  ).getDate()

  const allDays = Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, '0')
    return `${selectedMonth}-${day}`
  })

  async function handleCellEdit(date, field, value) {
    const parsed = field === 'cash_collected_usd' || field === 'revenue'
      ? parseFloat(value) || 0
      : parseInt(value) || 0
    await upsertDailyStat(date, { [field]: parsed })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <Sidebar />
      <div className="flex-1 ml-56">
        <Topbar
          title="Analytics"
          actions={
            <div className="flex items-center gap-3">
              {/* PKR Rate */}
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 text-xs">USD/PKR:</span>
                {editingRate ? (
                  <input
                    type="number"
                    value={pkrRate}
                    onChange={e => setPkrRate(parseFloat(e.target.value) || 0)}
                    onBlur={() => setEditingRate(false)}
                    autoFocus
                    className="w-20 bg-[#1a1a1a] text-white text-xs rounded px-2 py-1 border border-orange-500/50 focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setEditingRate(true)}
                    className="text-orange-400 text-xs hover:text-orange-300 transition"
                  >
                    {pkrRate}
                  </button>
                )}
              </div>

              {/* Month selector */}
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-[#1a1a1a] text-white text-sm rounded-lg px-3 py-1.5 border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50"
              >
                {MONTHS.map(m => (
                  <option key={m} value={m}>{formatMonth(m)}</option>
                ))}
              </select>
            </div>
          }
        />

        <main className="pt-14">
          {/* Stat Cards */}
          <div className="grid grid-cols-4 gap-4 p-6 border-b border-[#1f1f1f]">
            <StatCard
              label="Emails Sent"
              value={monthlyTotals?.emails_sent ?? 0}
              icon="✉️"
            />
            <StatCard
              label="Replies"
              value={monthlyTotals?.replies ?? 0}
              icon="💬"
              sub={`${replyRate}% reply rate`}
            />
            <StatCard
              label="Doc Opens"
              value={monthlyTotals?.docs_opened ?? 0}
              icon="📄"
            />
            <StatCard
              label="Calls Booked"
              value={monthlyTotals?.calls_booked ?? 0}
              icon="📞"
            />
            <StatCard
              label="Closes"
              value={monthlyTotals?.closes ?? 0}
              icon="🏆"
              accent
              sub={`${closeRate}% close rate`}
            />
            <StatCard
              label="LinkedIn DMs"
              value={monthlyTotals?.linkedin_dms ?? 0}
              icon="🔗"
            />
            <StatCard
              label="Cash Collected (USD)"
              value={`$${(monthlyTotals?.cash_collected_usd ?? 0).toLocaleString()}`}
              icon="💵"
              accent
            />
            <StatCard
              label="Cash Collected (PKR)"
              value={`₨${((monthlyTotals?.cash_collected_usd ?? 0) * pkrRate).toLocaleString()}`}
              icon="💰"
            />
          </div>

          {/* Daily Log Table */}
          <div className="p-6">
            <h2 className="text-white font-semibold text-sm mb-4">
              Daily Log — {formatMonth(selectedMonth)}
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#1f1f1f]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1f1f1f]">
                      {['Date', 'Emails Sent', 'Replies', 'LI DMs', 'Docs Opened', 'Calls Booked', 'Closes', 'Cash (USD)', 'Revenue'].map(col => (
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
                          {[
                            ['emails_sent', false],
                            ['replies', false],
                            ['linkedin_dms', false],
                            ['docs_opened', false],
                            ['calls_booked', false],
                            ['closes', false],
                            ['cash_collected_usd', true],
                            ['revenue', true],
                          ].map(([field, isDecimal]) => (
                            <td key={field} className="px-2 py-1">
                              <input
                                type="number"
                                defaultValue={row[field] ?? 0}
                                onBlur={e => {
                                  const val = e.target.value
                                  const original = String(row[field] ?? 0)
                                  if (val !== original) handleCellEdit(date, field, val)
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
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
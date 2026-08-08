import { useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'
import MonthlyStatsTable from '../components/analytics/MonthlyStatsTable'
import { useDailyStats } from '../hooks/useDailyStats'
import { getCurrentMonth, formatMonth } from '../utils/formatDate'

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date()
  d.setMonth(d.getMonth() - i)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})

export default function DailyLog() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const { dailyStats, monthlyTotals, upsertDailyStat, loading, error } = useDailyStats(selectedMonth)

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
    <div className="min-h-screen bg-ink p-5 md:p-6">
      <Topbar
        title="Daily Log"
        actions={
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-card-2 text-paper text-sm rounded-xl px-3 py-1.5 border border-line focus:outline-none focus:border-accent/50"
          >
            {MONTHS.map(m => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
        }
      />

      <div className="flex gap-5 items-start">
        <Sidebar />

        <main className="flex-1 min-w-0">
          <div className="bg-card border border-line rounded-[26px] p-5">
            <h2 className="font-display font-bold text-paper text-base mb-4">
              Daily Log — {formatMonth(selectedMonth)}
            </h2>

            {/* Cells save in the background, so a failed write has to say so —
                the number will have already snapped back on its own. */}
            {error && (
              <p className="bg-down-dim border border-down/30 text-down text-xs rounded-xl px-4 py-2.5 mb-4">
                Couldn't save: {error}
              </p>
            )}

            <MonthlyStatsTable
              allDays={allDays}
              dailyStats={dailyStats}
              monthlyTotals={monthlyTotals}
              loading={loading}
              onCellEdit={handleCellEdit}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

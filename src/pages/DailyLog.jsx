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
  const { dailyStats, monthlyTotals, upsertDailyStat, loading } = useDailyStats(selectedMonth)

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
          title="Daily Log"
          actions={
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-[#1a1a1a] text-white text-sm rounded-lg px-3 py-1.5 border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50"
            >
              {MONTHS.map(m => (
                <option key={m} value={m}>{formatMonth(m)}</option>
              ))}
            </select>
          }
        />

        <main className="pt-14">
          <div className="p-6">
            <h2 className="text-white font-semibold text-sm mb-4">
              Daily Log — {formatMonth(selectedMonth)}
            </h2>

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

import { useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'
import StatsRow from '../components/analytics/StatsRow'
import TrendChart from '../components/analytics/TrendChart'
import { useDailyStats } from '../hooks/useDailyStats'
import { getCurrentMonth, formatMonth } from '../utils/formatDate'

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date()
  d.setMonth(d.getMonth() - i)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})

export default function Analytics() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [pkrRate, setPkrRate] = useState(278)
  const [editingRate, setEditingRate] = useState(false)
  const { dailyStats, monthlyTotals, replyRate, closeRate } = useDailyStats(selectedMonth)

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
          <StatsRow
            monthlyTotals={monthlyTotals}
            replyRate={replyRate}
            closeRate={closeRate}
            pkrRate={pkrRate}
          />

          <div className="p-6">
            <TrendChart data={dailyStats} />
          </div>
        </main>
      </div>
    </div>
  )
}

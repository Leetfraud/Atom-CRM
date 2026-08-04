import { useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'
import StatsRow from '../components/analytics/StatsRow'
import TrendChart from '../components/analytics/TrendChart'
import GrowthChart from '../components/analytics/GrowthChart'
import RatesChart from '../components/analytics/RatesChart'
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
  const { dailyStats, monthlyTotals, replyRate, closeRate, docOpenRate } = useDailyStats(selectedMonth)

  return (
    <div className="min-h-screen bg-ink p-5 md:p-6">
      <Topbar
        title="Analytics"
        actions={
          <div className="flex items-center gap-3">
            {/* PKR Rate */}
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-fog">USD/PKR:</span>
              {editingRate ? (
                <input
                  type="number"
                  value={pkrRate}
                  onChange={e => setPkrRate(parseFloat(e.target.value) || 0)}
                  onBlur={() => setEditingRate(false)}
                  autoFocus
                  className="w-20 bg-card-2 text-paper text-xs rounded-lg px-2 py-1 border border-accent/50 focus:outline-none"
                />
              ) : (
                <button
                  onClick={() => setEditingRate(true)}
                  className="text-accent hover:text-paper transition"
                >
                  {pkrRate}
                </button>
              )}
            </div>

            {/* Month selector */}
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-card-2 text-paper text-sm rounded-xl px-3 py-1.5 border border-line focus:outline-none focus:border-accent/50"
            >
              {MONTHS.map(m => (
                <option key={m} value={m}>{formatMonth(m)}</option>
              ))}
            </select>
          </div>
        }
      />

      <div className="flex gap-5 items-start">
        <Sidebar />

        <main className="flex-1 min-w-0 flex flex-col gap-5">
          <StatsRow
            monthlyTotals={monthlyTotals}
            replyRate={replyRate}
            closeRate={closeRate}
            docOpenRate={docOpenRate}
            pkrRate={pkrRate}
          />

          <TrendChart data={dailyStats} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <GrowthChart data={dailyStats} />
            <RatesChart replyRate={replyRate} docOpenRate={docOpenRate} closeRate={closeRate} />
          </div>
        </main>
      </div>
    </div>
  )
}

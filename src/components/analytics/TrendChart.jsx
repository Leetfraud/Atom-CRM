import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PeriodToggle from './PeriodToggle'

const SERIES = [
  { key: 'emails_sent', label: 'Emails Sent', color: '#3b82f6' },
  { key: 'replies', label: 'Replies', color: '#10b981' },
  { key: 'closes', label: 'Closes', color: '#d95926' },
]

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 shadow-xl min-w-[180px]">
      <p className="text-white text-xs font-bold mb-2">{formatDate(label)}</p>
      <div className="flex flex-col gap-1.5">
        {payload.map(entry => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rotate-45 shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-zinc-400 text-xs">{SERIES.find(s => s.key === entry.dataKey)?.label}</span>
            </div>
            <span className="text-white font-bold text-xs tabular-nums">{entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DiamondLegend() {
  return (
    <div className="flex items-center gap-5">
      {SERIES.map(s => (
        <div key={s.key} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rotate-45 shrink-0" style={{ backgroundColor: s.color }} />
          <span className="text-zinc-300 text-[11px] font-semibold uppercase tracking-wide">{s.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function TrendChart({ data }) {
  const [period, setPeriod] = useState('month')
  if (!data?.length) return null

  const view = period === 'week' ? data.slice(-7) : data

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <h3 className="text-white font-semibold text-sm">Daily Trend</h3>
          <PeriodToggle value={period} onChange={setPeriod} />
        </div>
        <DiamondLegend />
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={view} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#333333" strokeDasharray="4 4" horizontal={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#333333"
            tick={{ fill: '#60a5fa', fontSize: 11, fontWeight: 600 }}
            tickLine={false}
            axisLine={{ stroke: '#333333' }}
          />
          <YAxis
            stroke="#333333"
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '4 4' }} />
          {SERIES.map(s => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: s.color, stroke: '#111111', strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

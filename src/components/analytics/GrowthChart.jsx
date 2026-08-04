import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PeriodToggle from './PeriodToggle'

const COLOR = '#6fe3b4'

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatUsd(value) {
  return `$${value.toLocaleString()}`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-line rounded-2xl px-4 py-3 shadow-xl min-w-[180px]">
      <p className="font-display text-paper text-xs font-bold mb-2">{formatDate(label)}</p>
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rotate-45 shrink-0" style={{ backgroundColor: COLOR }} />
          <span className="text-paper-dim text-xs">Cumulative Revenue</span>
        </div>
        <span className="font-mono text-paper font-semibold text-xs tabular-nums">{formatUsd(payload[0].value)}</span>
      </div>
    </div>
  )
}

export default function GrowthChart({ data }) {
  const [period, setPeriod] = useState('month')
  if (!data?.length) return null

  let running = 0
  const cumulative = data.map(row => {
    running += row.revenue || 0
    return { date: row.date, cumulative_revenue: running }
  })
  const view = period === 'week' ? cumulative.slice(-7) : cumulative

  return (
    <div className="bg-card border border-line rounded-[26px] p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="font-display font-bold text-paper text-base">Revenue Growth</h3>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={view} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLOR} stopOpacity={0.25} />
              <stop offset="100%" stopColor={COLOR} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#232325" strokeDasharray="3 5" horizontal={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#232325"
            tick={{ fill: '#5c5c60', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#232325' }}
          />
          <YAxis
            stroke="#232325"
            tick={{ fill: '#5c5c60', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#5c5c60', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Area
            type="monotone"
            dataKey="cumulative_revenue"
            stroke={COLOR}
            strokeWidth={2.5}
            fill="url(#growthFill)"
            dot={false}
            activeDot={{ r: 5, fill: COLOR, stroke: '#0d0d0e', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const COLOR = '#d95926'

function formatDay(dateStr) {
  return new Date(dateStr + 'T12:00:00').getDate()
}

function formatUsd(value) {
  return `$${value.toLocaleString()}`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 shadow-lg">
      <p className="text-zinc-500 text-xs mb-1.5">
        {new Date(label + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
      </p>
      <div className="flex items-center gap-2 text-xs">
        <span className="w-3 h-0.5 rounded-full shrink-0" style={{ backgroundColor: COLOR }} />
        <span className="text-white font-semibold tabular-nums">{formatUsd(payload[0].value)}</span>
        <span className="text-zinc-500">cumulative revenue</span>
      </div>
    </div>
  )
}

export default function GrowthChart({ data }) {
  if (!data?.length) return null

  let running = 0
  const cumulative = data.map(row => {
    running += row.revenue || 0
    return { date: row.date, cumulative_revenue: running }
  })

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5">
      <h3 className="text-white font-semibold text-sm mb-4">Revenue Growth</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={cumulative} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLOR} stopOpacity={0.25} />
              <stop offset="100%" stopColor={COLOR} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#2c2c2a" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            stroke="#383835"
            tick={{ fill: '#898781', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#383835' }}
          />
          <YAxis
            stroke="#383835"
            tick={{ fill: '#898781', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#383835', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="cumulative_revenue"
            stroke={COLOR}
            strokeWidth={2}
            fill="url(#growthFill)"
            dot={false}
            activeDot={{ r: 5, fill: COLOR, stroke: '#111111', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

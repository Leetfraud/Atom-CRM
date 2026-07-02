import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const SERIES = [
  { key: 'emails_sent', label: 'Emails Sent', color: '#3987e5' },
  { key: 'replies', label: 'Replies', color: '#199e70' },
  { key: 'closes', label: 'Closes', color: '#d95926' },
]

function formatDay(dateStr) {
  return new Date(dateStr + 'T12:00:00').getDate()
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 shadow-lg">
      <p className="text-zinc-500 text-xs mb-1.5">
        {new Date(label + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
      </p>
      {payload.map(entry => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <span className="w-3 h-0.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-white font-semibold tabular-nums">{entry.value}</span>
          <span className="text-zinc-500">{SERIES.find(s => s.key === entry.dataKey)?.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function TrendChart({ data }) {
  if (!data?.length) return null

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5">
      <h3 className="text-white font-semibold text-sm mb-4">Daily Trend</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
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
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#383835', strokeWidth: 1 }} />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={value => (
              <span className="text-zinc-400">{SERIES.find(s => s.key === value)?.label ?? value}</span>
            )}
          />
          {SERIES.map(s => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: s.color, stroke: '#111111', strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

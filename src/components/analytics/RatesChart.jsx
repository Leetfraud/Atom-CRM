import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts'

function RateLabel({ x, y, width, height, value }) {
  return (
    <text
      x={x + width + 8}
      y={y + height / 2}
      dy={4}
      className="fill-white text-xs font-semibold tabular-nums"
    >
      {value}%
    </text>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, value, fill } = payload[0].payload
  return (
    <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 shadow-xl min-w-[160px]">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rotate-45 shrink-0" style={{ backgroundColor: fill }} />
          <span className="text-zinc-400 text-xs">{name}</span>
        </div>
        <span className="text-white font-bold text-xs tabular-nums">{value}%</span>
      </div>
    </div>
  )
}

export default function RatesChart({ replyRate, docOpenRate, closeRate }) {
  const data = [
    { name: 'Reply Rate', value: Number(replyRate), fill: '#3b82f6' },
    { name: 'Doc Open Rate', value: Number(docOpenRate), fill: '#10b981' },
    { name: 'Close Rate', value: Number(closeRate), fill: '#d95926' },
  ]

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5">
      <h3 className="text-white font-semibold text-sm mb-4">Conversion Rates</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 0, left: 8 }}
          barSize={20}
        >
          <CartesianGrid stroke="#333333" strokeDasharray="4 4" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            stroke="#333333"
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#333333' }}
            tickFormatter={v => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#333333"
            tick={{ fill: '#a1a1aa', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff', fillOpacity: 0.03 }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map(entry => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
            <LabelList dataKey="value" content={RateLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

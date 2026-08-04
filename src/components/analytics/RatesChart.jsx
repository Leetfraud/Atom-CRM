import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts'

function RateLabel({ x, y, width, height, value }) {
  return (
    <text
      x={x + width + 8}
      y={y + height / 2}
      dy={4}
      className="fill-paper text-xs font-semibold tabular-nums"
      style={{ fontFamily: 'JetBrains Mono, monospace' }}
    >
      {value}%
    </text>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, value, fill } = payload[0].payload
  return (
    <div className="bg-card border border-line rounded-2xl px-4 py-3 shadow-xl min-w-[160px]">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rotate-45 shrink-0" style={{ backgroundColor: fill }} />
          <span className="text-paper-dim text-xs">{name}</span>
        </div>
        <span className="font-mono text-paper font-semibold text-xs tabular-nums">{value}%</span>
      </div>
    </div>
  )
}

export default function RatesChart({ replyRate, docOpenRate, closeRate }) {
  const data = [
    { name: 'Reply Rate', value: Number(replyRate), fill: '#6d8dff' },
    { name: 'Doc Open Rate', value: Number(docOpenRate), fill: '#6fe3b4' },
    { name: 'Close Rate', value: Number(closeRate), fill: '#ff8a3d' },
  ]

  return (
    <div className="bg-card border border-line rounded-[26px] p-5">
      <h3 className="font-display font-bold text-paper text-base mb-4">Conversion Rates</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 0, left: 8 }}
          barSize={20}
        >
          <CartesianGrid stroke="#232325" strokeDasharray="3 5" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            stroke="#232325"
            tick={{ fill: '#5c5c60', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#232325' }}
            tickFormatter={v => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#232325"
            tick={{ fill: '#9a9a9d', fontSize: 12 }}
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

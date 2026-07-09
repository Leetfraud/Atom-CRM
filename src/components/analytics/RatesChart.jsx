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
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2 text-xs">
        <span className="w-3 h-0.5 rounded-full shrink-0" style={{ backgroundColor: fill }} />
        <span className="text-white font-semibold tabular-nums">{value}%</span>
        <span className="text-zinc-500">{name}</span>
      </div>
    </div>
  )
}

export default function RatesChart({ replyRate, docOpenRate, closeRate }) {
  const data = [
    { name: 'Reply Rate', value: Number(replyRate), fill: '#3987e5' },
    { name: 'Doc Open Rate', value: Number(docOpenRate), fill: '#199e70' },
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
          <CartesianGrid stroke="#2c2c2a" strokeDasharray="0" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            stroke="#383835"
            tick={{ fill: '#898781', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#383835' }}
            tickFormatter={v => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#383835"
            tick={{ fill: '#898781', fontSize: 12 }}
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

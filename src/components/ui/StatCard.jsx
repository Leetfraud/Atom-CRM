export default function StatCard({ icon, label, value, sub, accent = false }) {
  return (
    <div className={`bg-[#111111] border rounded-xl p-5 flex flex-col gap-3 ${accent ? 'border-orange-500/50' : 'border-[#1f1f1f]'}`}>
      <div className="flex items-center justify-between">
        <span className="text-zinc-400 text-xs uppercase tracking-widest font-medium">{label}</span>
        {icon && <span className="text-orange-500 text-lg">{icon}</span>}
      </div>
      <p className="text-white text-3xl font-bold tracking-tight">{value ?? '—'}</p>
      {sub && <p className="text-zinc-600 text-xs">{sub}</p>}
    </div>
  )
}
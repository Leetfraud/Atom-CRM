export default function StatCard({ icon, label, value, sub, accent = false }) {
  return (
    <div className={`bg-card-2 border rounded-2xl p-4 flex flex-col gap-3 ${accent ? 'border-mint/40' : 'border-line'}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wide text-fog">{label}</span>
        {icon && (
          <span className="w-7 h-7 rounded-lg bg-ink border border-line flex items-center justify-center text-paper-dim shrink-0">
            {icon}
          </span>
        )}
      </div>
      <p className={`font-display font-bold text-2xl tracking-tight ${accent ? 'text-mint' : 'text-paper'}`}>{value ?? '—'}</p>
      {sub && <p className="font-mono text-[11px] text-fog">{sub}</p>}
    </div>
  )
}

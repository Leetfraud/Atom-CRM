export default function Dropdown({ label, value, onChange, options, className = '' }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="font-mono text-[10px] uppercase tracking-wide text-fog">{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`bg-card-2 text-paper rounded-xl px-4 py-2.5 text-sm border border-line focus:outline-none focus:border-accent/50 transition ${className}`}
      >
        {options.map(opt => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
    </div>
  )
}

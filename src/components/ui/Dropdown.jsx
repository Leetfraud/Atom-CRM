export default function Dropdown({ label, value, onChange, options, className = '' }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-zinc-400 text-xs uppercase tracking-widest">{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`bg-[#1a1a1a] text-white rounded-lg px-4 py-2.5 text-sm border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50 transition ${className}`}
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
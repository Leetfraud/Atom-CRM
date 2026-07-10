export default function PeriodToggle({ value, onChange, options = ['week', 'month', 'year'] }) {
  return (
    <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-1">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide transition ${
            value === opt
              ? 'bg-orange-500 text-white'
              : 'text-zinc-500 hover:text-white'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

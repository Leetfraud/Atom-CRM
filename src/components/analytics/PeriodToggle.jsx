export default function PeriodToggle({ value, onChange, options = ['week', 'month', 'year'] }) {
  return (
    <div className="flex items-center gap-1 bg-card-2 border border-line rounded-full p-1">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1 rounded-full font-mono text-[11px] uppercase tracking-wide transition ${
            value === opt ? 'bg-paper text-ink' : 'text-fog hover:text-paper'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

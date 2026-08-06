// `className` lands on the wrapper, not the <input>: callers pass grid
// utilities like "col-span-2", and the wrapper is the grid item.
export default function Input({ label, value, onChange, placeholder, type = 'text', className = '' }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="font-mono text-[10px] uppercase tracking-wide text-fog">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="bg-card-2 text-paper rounded-xl px-4 py-2.5 text-sm border border-line focus:outline-none focus:border-accent/50 placeholder-fog transition"
      />
    </div>
  )
}

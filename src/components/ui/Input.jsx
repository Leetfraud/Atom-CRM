export default function Input({ label, value, onChange, placeholder, type = 'text', className = '' }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-zinc-400 text-xs uppercase tracking-widest">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`bg-[#1a1a1a] text-white rounded-lg px-4 py-2.5 text-sm border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50 placeholder-zinc-600 transition ${className}`}
      />
    </div>
  )
}
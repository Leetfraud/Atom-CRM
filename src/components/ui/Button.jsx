const variants = {
  primary: 'bg-orange-500 text-white hover:bg-orange-600',
  secondary: 'bg-[#1f1f1f] text-white hover:bg-[#2a2a2a] border border-[#2a2a2a]',
  danger: 'bg-red-950 text-red-400 hover:bg-red-900 border border-red-900',
  ghost: 'text-zinc-400 hover:text-white hover:bg-[#1f1f1f]',
}

export default function Button({ children, onClick, variant = 'primary', disabled, className = '', type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
const variants = {
  primary: 'bg-paper text-ink hover:bg-paper/90',
  secondary: 'bg-card-2 text-paper-dim border border-line hover:text-paper hover:border-paper-dim',
  danger: 'bg-down-dim text-down border border-down/30 hover:bg-down/20',
  ghost: 'text-fog hover:text-paper hover:bg-card-2',
}

export default function Button({ children, onClick, variant = 'primary', disabled, className = '', type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-mono text-[11px] uppercase tracking-wide transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

import { useEffect } from 'react'

export default function Modal({ isOpen, onClose, title, children, width = 'max-w-2xl' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-[#111111] border border-[#1f1f1f] rounded-xl w-full ${width} max-h-[90vh] overflow-y-auto z-10`}>
        <div className="flex items-center justify-between p-6 border-b border-[#1f1f1f]">
          <h2 className="text-white font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition text-xl leading-none">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
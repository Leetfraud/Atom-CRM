import { useState, useEffect, useRef } from 'react'
import { useTeamChat } from '../../hooks/useTeamChat'
import { useAuth } from '../../context/AuthContext'

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function TeamChat({ isOpen, onClose }) {
  const { messages, loading, sendMessage } = useTeamChat()
  const { user } = useAuth()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    await sendMessage(text)
    setSending(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={onClose}
        />
      )}

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-card border-l border-line z-40 flex flex-col transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="h-14 border-b border-line flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-paper-dim">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span className="font-display font-bold text-paper text-sm">Team Chat</span>
          </div>
          <button
            onClick={onClose}
            className="text-fog hover:text-paper transition text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? (
            <p className="text-fog text-xs text-center pt-8">Loading…</p>
          ) : messages.length === 0 ? (
            <p className="text-fog text-xs text-center pt-8">No messages yet. Say hi!</p>
          ) : (
            messages.map(msg => {
              const isOwn = msg.sender_id === user?.id
              return (
                <div key={msg.id} className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-baseline gap-1.5">
                    {!isOwn && (
                      <span className="text-accent text-xs font-medium">{msg.sender_name}</span>
                    )}
                    <span className="text-fog text-[10px]">{formatTime(msg.created_at)}</span>
                  </div>
                  <div
                    className={`max-w-[240px] px-3 py-2 rounded-2xl text-sm leading-snug break-words ${
                      isOwn
                        ? 'bg-accent-dim text-paper border border-accent/30'
                        : 'bg-card-2 text-paper-dim border border-line'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-line p-3 shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message the team…"
              rows={1}
              className="flex-1 bg-card-2 border border-line rounded-xl px-3 py-2 text-sm text-paper placeholder-fog resize-none focus:outline-none focus:border-accent/40 transition"
              style={{ minHeight: '38px', maxHeight: '100px' }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="bg-paper hover:bg-paper/90 disabled:opacity-30 disabled:cursor-not-allowed text-ink font-mono text-[11px] uppercase tracking-wide font-semibold px-3 py-2 rounded-full transition shrink-0"
            >
              Send
            </button>
          </div>
          <p className="text-fog text-[10px] mt-1.5">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </>
  )
}

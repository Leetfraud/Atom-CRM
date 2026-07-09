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
        className={`fixed top-0 right-0 h-full w-80 bg-[#0d0d0d] border-l border-[#1f1f1f] z-40 flex flex-col transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="h-14 border-b border-[#1f1f1f] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm">💬</span>
            <span className="text-white font-semibold text-sm">Team Chat</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? (
            <p className="text-zinc-600 text-xs text-center pt-8">Loading…</p>
          ) : messages.length === 0 ? (
            <p className="text-zinc-600 text-xs text-center pt-8">No messages yet. Say hi!</p>
          ) : (
            messages.map(msg => {
              const isOwn = msg.sender_id === user?.id
              return (
                <div key={msg.id} className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-baseline gap-1.5">
                    {!isOwn && (
                      <span className="text-orange-400 text-xs font-medium">{msg.sender_name}</span>
                    )}
                    <span className="text-zinc-600 text-[10px]">{formatTime(msg.created_at)}</span>
                  </div>
                  <div
                    className={`max-w-[240px] px-3 py-2 rounded-lg text-sm leading-snug break-words ${
                      isOwn
                        ? 'bg-orange-500/15 text-orange-100 border border-orange-500/20'
                        : 'bg-[#1a1a1a] text-zinc-200 border border-[#2a2a2a]'
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
        <div className="border-t border-[#1f1f1f] p-3 shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message the team…"
              rows={1}
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-orange-500/40 transition"
              style={{ minHeight: '38px', maxHeight: '100px' }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="bg-orange-500 hover:bg-orange-400 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2 rounded-lg transition shrink-0"
            >
              Send
            </button>
          </div>
          <p className="text-zinc-700 text-[10px] mt-1.5">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </>
  )
}
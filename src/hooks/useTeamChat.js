import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useTeamChat() {
  const { user, displayName } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchMessages()

    const channel = supabase
      .channel('team_messages_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_messages' },
        payload => {
          const msg = payload.new
          // Dedupe on id rather than tracking what we sent: the broadcast for
          // our own message can arrive before the insert call returns, so
          // there is no moment at which we could pre-register the id.
          setMessages(prev => (
            prev.some(m => m.id === msg.id) ? prev : [...prev, msg]
          ))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchMessages() {
    try {
      const { data, error } = await supabase
        .from('team_messages')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      setMessages(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage(text) {
    const trimmed = (text ?? '').trim()
    if (!trimmed || !user) return

    const senderName = displayName || user.email?.split('@')[0] || 'Unknown'

    // Optimistic: add locally immediately with a temp id
    const tempId = `temp-${Date.now()}`
    const optimistic = {
      id: tempId,
      sender_id: user.id,
      sender_name: senderName,
      message: trimmed,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    const { data, error } = await supabase
      .from('team_messages')
      .insert({ sender_id: user.id, sender_name: senderName, message: trimmed })
      .select()
      .single()

    if (error) {
      // Roll back optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempId))
      return { error: error.message }
    }

    // Swap the temp row for the real one, unless the realtime broadcast already
    // delivered it — in which case just drop the temp and keep its position.
    setMessages(prev => {
      const withoutTemp = prev.filter(m => m.id !== tempId)
      return withoutTemp.some(m => m.id === data.id) ? withoutTemp : [...withoutTemp, data]
    })
    return { error: null }
  }

  return { messages, loading, error, sendMessage }
}
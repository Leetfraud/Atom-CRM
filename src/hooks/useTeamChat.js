import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useTeamChat() {
  const { user, displayName } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Track message ids we sent optimistically so we don't duplicate on realtime event
  const sentIds = useRef(new Set())

  useEffect(() => {
    fetchMessages()

    const channel = supabase
      .channel('team_messages_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_messages' },
        payload => {
          const msg = payload.new
          // Skip if we already added this optimistically
          if (sentIds.current.has(msg.id)) {
            sentIds.current.delete(msg.id)
            return
          }
          setMessages(prev => [...prev, msg])
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

    // Replace temp with real id; register real id so realtime event is skipped
    sentIds.current.add(data.id)
    setMessages(prev => prev.map(m => m.id === tempId ? data : m))
    return { error: null }
  }

  return { messages, loading, error, sendMessage }
}
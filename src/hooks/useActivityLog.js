import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useActivityLog(prospectId) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (prospectId) fetchLogs()
  }, [prospectId])

  async function fetchLogs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('prospect_activity_log')
      .select('*')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false })

    if (!error) setLogs(data)
    setLoading(false)
  }

  async function addLog(type, action, note = null) {
    const { error } = await supabase
      .from('prospect_activity_log')
      .insert({ prospect_id: prospectId, type, action, note })

    if (!error) await fetchLogs()
    return { error }
  }

  return { logs, loading, addLog, refetch: fetchLogs }

  
}
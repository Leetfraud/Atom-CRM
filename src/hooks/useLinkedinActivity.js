import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function useLinkedinActivity(addLog) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function updateLinkedinPipeline(prospectId, updates) {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('linkedin_pipeline')
        .update({
          ...updates,
          last_action_date: new Date().toISOString()
        })
        .eq('prospect_id', prospectId)
      if (error) throw error

      if (updates.connection_status && addLog) {
        await addLog('linkedin', `Connection status changed to "${updates.connection_status}"`)
      }
      if (updates.dm_status && addLog) {
        await addLog('linkedin', `DM status changed to "${updates.dm_status}"`)
      }

      return { error: null }
    } catch (err) {
      setError(err.message)
      return { error: err.message }
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, updateLinkedinPipeline }
}
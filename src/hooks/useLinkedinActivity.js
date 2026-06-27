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

  async function markConnected(prospectId) {
    return updateLinkedinPipeline(prospectId, {
      connection_status: 'Connected',
      connection_accepted_at: new Date().toISOString()
    })
  }

  async function logMessage(prospectId) {
    return updateLinkedinPipeline(prospectId, {
      dm_status: 'Message Sent',
      message_date: new Date().toISOString()
    })
  }

  async function logFollowUp(prospectId, currentFollowUps) {
    const next = currentFollowUps + 1
    return updateLinkedinPipeline(prospectId, {
      follow_ups_sent: next,
      dm_status: `Follow-up ${next}`
    })
  }

  async function markResponded(prospectId, dmStatus) {
    return updateLinkedinPipeline(prospectId, {
      responded: true,
      dm_status: dmStatus
    })
  }

  async function markCallBooked(prospectId) {
    return updateLinkedinPipeline(prospectId, {
      call_booked: true,
      dm_status: 'Call Booked'
    })
  }

  async function markOnboarded(prospectId) {
    return updateLinkedinPipeline(prospectId, {
      onboarded: true,
      dm_status: 'Converted - Closed'
    })
  }

  return {
    loading,
    error,
    updateLinkedinPipeline,
    markConnected,
    logMessage,
    logFollowUp,
    markResponded,
    markCallBooked,
    markOnboarded
  }
}
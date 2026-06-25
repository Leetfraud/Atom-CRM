import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function useEmailActivity() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function updateEmailPipeline(prospectId, updates) {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('email_pipeline')
        .update(updates)
        .eq('prospect_id', prospectId)
      if (error) throw error
      return { error: null }
    } catch (err) {
      setError(err.message)
      return { error: err.message }
    } finally {
      setLoading(false)
    }
  }

  async function logEmailSent(prospectId, inboxUsed, sequenceStage) {
    setLoading(true)
    try {
      // Increment emails_sent and update stage info
      const { data: current } = await supabase
        .from('email_pipeline')
        .select('emails_sent')
        .eq('prospect_id', prospectId)
        .single()

      const { error } = await supabase
        .from('email_pipeline')
        .update({
          emails_sent: (current?.emails_sent || 0) + 1,
          inbox_used: inboxUsed,
          sequence_stage: sequenceStage,
          last_email_date: new Date().toISOString()
        })
        .eq('prospect_id', prospectId)

      if (error) throw error
      return { error: null }
    } catch (err) {
      setError(err.message)
      return { error: err.message }
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, updateEmailPipeline, logEmailSent }
}
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useProspects(searchQuery = '') {
  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchProspects()
  }, [searchQuery])

  async function fetchProspects() {
    setLoading(true)
    try {
      let query = supabase
        .from('prospects')
        .select(`
          *,
          email_pipeline(*),
          linkedin_pipeline(*),
          prospect_tags(tag)
        `)
        .order('created_at', { ascending: false })

      if (searchQuery) {
        query = query.textSearch('search_vector', searchQuery)
      }

      const { data, error } = await query
      if (error) throw error
      setProspects(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  async function generateSerial() {
  const { data } = await supabase
    .from('prospects')
    .select('serial')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data?.serial) return 'LEAD-001'

  const match = data.serial.match(/\d+/)
  if (!match) return 'LEAD-001'

  const next = parseInt(match[0]) + 1
  return `LEAD-${String(next).padStart(3, '0')}`
}

  async function addProspect(prospectData) {
    const { tags, email_pipeline, linkedin_pipeline, ...prospect } = prospectData
    try {
      // Insert prospect
      const { data, error } = await supabase
        .from('prospects')
        .insert(prospect)
        .select()
        .single()
      if (error) throw error

      const prospectId = data.id

      // Insert email pipeline row
      await supabase.from('email_pipeline').insert({
        prospect_id: prospectId,
        ...email_pipeline
      })

      // Insert linkedin pipeline row
      await supabase.from('linkedin_pipeline').insert({
        prospect_id: prospectId,
        connection_sent_at: new Date().toISOString(),
        ...linkedin_pipeline
      })

      // Insert tags
      if (tags?.length) {
        await supabase.from('prospect_tags').insert(
          tags.map(tag => ({ prospect_id: prospectId, tag }))
        )
      }

      await fetchProspects()
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err.message }
    }
  }

  async function updateProspect(id, updates) {
    try {
      const { error } = await supabase
        .from('prospects')
        .update(updates)
        .eq('id', id)
      if (error) throw error
      await fetchProspects()
      return { error: null }
    } catch (err) {
      return { error: err.message }
    }
  }

  async function deleteProspect(id) {
    try {
      const { error } = await supabase
        .from('prospects')
        .delete()
        .eq('id', id)
      if (error) throw error
      await fetchProspects()
      return { error: null }
    } catch (err) {
      return { error: err.message }
    }
  }

  return { prospects, loading, error, addProspect, updateProspect, deleteProspect, refetch: fetchProspects, generateSerial }
}
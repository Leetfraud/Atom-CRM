import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Bulk writes across a set of selected prospects. Each action is a single
// query over `.in('prospect_id', ids)` rather than one request per row.
//
// Nothing here refetches — the caller owns the prospect list and decides when
// to resync, so a caller applying several actions in a row isn't forced into a
// fetch per action.
export function useBulkActions() {
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState(null)

  // Every action shares the same shape: guard empty input, flip `applying`,
  // and normalise whatever went wrong into a single message string.
  async function run(ids, fn) {
    if (!ids?.length) return { error: null }
    setApplying(true)
    setError(null)
    try {
      const message = await fn()
      if (message) {
        setError(message)
        return { error: message }
      }
      return { error: null }
    } catch (err) {
      const message = err?.message ?? String(err)
      setError(message)
      return { error: message }
    } finally {
      setApplying(false)
    }
  }

  function setStage(prospectIds, stage) {
    return run(prospectIds, async () => {
      const { error } = await supabase
        .from('email_pipeline')
        .update({ stage })
        .in('prospect_id', prospectIds)
      return error?.message ?? null
    })
  }

  function setDmStatus(prospectIds, dm_status) {
    return run(prospectIds, async () => {
      const { error } = await supabase
        .from('linkedin_pipeline')
        .update({ dm_status })
        .in('prospect_id', prospectIds)
      return error?.message ?? null
    })
  }

  // Some of the selected prospects may already carry the tag. The schema isn't
  // in this repo (it's managed in the Supabase project) so we can't confirm a
  // unique index on (prospect_id, tag) exists — and `ignoreDuplicates` only
  // does anything when one does. Reading the existing rows first and inserting
  // the difference behaves correctly either way.
  function addTag(prospectIds, tag) {
    return run(prospectIds, async () => {
      const { data: existing, error: readError } = await supabase
        .from('prospect_tags')
        .select('prospect_id')
        .eq('tag', tag)
        .in('prospect_id', prospectIds)
      if (readError) return readError.message

      const alreadyTagged = new Set((existing ?? []).map(r => r.prospect_id))
      const rows = prospectIds
        .filter(id => !alreadyTagged.has(id))
        .map(id => ({ prospect_id: id, tag }))
      if (rows.length === 0) return null

      const { error } = await supabase.from('prospect_tags').insert(rows)
      return error?.message ?? null
    })
  }

  function removeTag(prospectIds, tag) {
    return run(prospectIds, async () => {
      const { error } = await supabase
        .from('prospect_tags')
        .delete()
        .eq('tag', tag)
        .in('prospect_id', prospectIds)
      return error?.message ?? null
    })
  }

  return { applying, error, setStage, setDmStatus, addTag, removeTag }
}

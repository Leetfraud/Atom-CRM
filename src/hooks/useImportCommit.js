import { useState } from 'react'
import { supabase } from '../lib/supabase'

const BATCH_SIZE = 50

function pad(n) {
  return String(n).padStart(3, '0')
}

// Parse a free-form date string into an ISO timestamp, or null if unparseable.
function toIso(value) {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export function useImportCommit() {
  const [committing, setCommitting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState(null)

  // Assign a serial to every row up front. Prefer the row's own serial (from the
  // LinkedIn export) when present and not already taken — otherwise generate the
  // next LEAD-NNN. Collisions are resolved locally against the whole batch so we
  // never fire one generateSerial() request per row.
  function assignSerials(rows, existingSerials) {
    const used = new Set(existingSerials)
    let counter = 0
    for (const s of existingSerials) {
      const m = /(\d+)/.exec(s ?? '')
      if (m) counter = Math.max(counter, parseInt(m[1], 10))
    }

    return rows.map(row => {
      let serial = (row.serial ?? '').trim()
      if (!serial || used.has(serial)) {
        do {
          counter += 1
          serial = `LEAD-${pad(counter)}`
        } while (used.has(serial))
      }
      used.add(serial)
      return { ...row, serial }
    })
  }

  async function commit(rows) {
    const active = rows.filter(r => r.included)
    if (active.length === 0) return { error: 'Nothing selected to import.' }

    setCommitting(true)
    setError(null)
    setProgress({ done: 0, total: active.length })

    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('prospects')
        .select('serial')
      if (fetchErr) throw fetchErr

      const prepared = assignSerials(active, (existing ?? []).map(p => p.serial))

      let done = 0
      for (const group of chunk(prepared, BATCH_SIZE)) {
        // 1) prospects
        const prospectRows = group.map(r => ({
          serial: r.serial,
          first_name: r.first_name || null,
          last_name: r.last_name || null,
          company: r.company || null,
          role_title: r.role_title || null,
          email: r.email || null,
          linkedin_url: r.linkedin_url || null,
          company_url: r.company_url || null,
          gamma_doc_url: r.gamma_doc_url || null,
          youtube_url: r.youtube_url || null,
          place: r.place || null,
          notes: r.notes || null,
        }))

        const { data: inserted, error: insErr } = await supabase
          .from('prospects')
          .insert(prospectRows)
          .select('id, serial')
        if (insErr) throw insErr

        // Map serial -> new id (serial is unique per row in this batch).
        const idBySerial = new Map(inserted.map(p => [p.serial, p.id]))

        // 2) email_pipeline
        const emailRows = group
          .map(r => {
            const id = idBySerial.get(r.serial)
            if (!id) return null
            return { prospect_id: id, stage: r.email_stage || 'Prospects' }
          })
          .filter(Boolean)
        if (emailRows.length) {
          const { error } = await supabase.from('email_pipeline').insert(emailRows)
          if (error) throw error
        }

        // 3) linkedin_pipeline
        const liRows = group
          .map(r => {
            const id = idBySerial.get(r.serial)
            if (!id) return null
            return {
              prospect_id: id,
              connection_status: r.connection_status || 'Pending',
              dm_status: r.dm_status || 'Not Sent',
              connection_sent_at: toIso(r.connection_sent_at),
              last_action_date: toIso(r.last_action_date),
            }
          })
          .filter(Boolean)
        if (liRows.length) {
          const { error } = await supabase.from('linkedin_pipeline').insert(liRows)
          if (error) throw error
        }

        // 4) prospect_tags
        const tagRows = group.flatMap(r => {
          const id = idBySerial.get(r.serial)
          if (!id || !r.tags?.length) return []
          return r.tags.map(tag => ({ prospect_id: id, tag }))
        })
        if (tagRows.length) {
          const { error } = await supabase.from('prospect_tags').insert(tagRows)
          if (error) throw error
        }

        done += group.length
        setProgress({ done, total: active.length })
      }

      return { error: null, count: active.length }
    } catch (err) {
      setError(err.message)
      return { error: err.message }
    } finally {
      setCommitting(false)
    }
  }

  return { commit, committing, progress, error }
}

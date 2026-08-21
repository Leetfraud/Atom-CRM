import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchNotionSyncState } from './useNotionImport'
import {
  EMAIL_PIPELINE_STAGES,
  LINKEDIN_CONNECTION_STATUSES,
  LINKEDIN_DM_STATUSES
} from '../utils/constants'

const BATCH_SIZE = 50

// Scalar prospect fields a re-import is allowed to refresh.
//
// notes is deliberately absent. The Notion page body seeded it on first import,
// but prospects.notes is what the team edits in Atom afterwards (there is a
// whole note-history UI on the detail card) — silently replacing that with the
// page body on every re-sync would destroy work. New prospects still get their
// notes; existing ones keep theirs.
const REFRESHABLE_FIELDS = [
  'first_name', 'last_name', 'company', 'role_title', 'email',
  'linkedin_url', 'company_url', 'gamma_doc_url', 'youtube_url', 'place',
]

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

function clampEnum(value, options, fallback) {
  return options.includes(value) ? value : fallback
}

// Group rows by the value they want written, so a few hundred updates collapse
// into one request per distinct value rather than one per row.
function groupBy(rows, keyFn) {
  const groups = new Map()
  for (const row of rows) {
    const key = keyFn(row)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  return groups
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

  // --- inserts: unchanged from the original one-shot import ------------------
  async function insertGroup(group) {
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
      notion_page_id: r.notion_page_id || null,
      notion_last_edited_at: r.notion_last_edited_at || null,
    }))

    const { data: inserted, error: insErr } = await supabase
      .from('prospects')
      .insert(prospectRows)
      .select('id, serial')
    if (insErr) throw insErr

    // Map serial -> new id (serial is unique per row in this batch).
    const idBySerial = new Map(inserted.map(p => [p.serial, p.id]))

    const emailRows = group
      .map(r => {
        const id = idBySerial.get(r.serial)
        if (!id) return null
        return { prospect_id: id, stage: clampEnum(r.email_stage, EMAIL_PIPELINE_STAGES, 'Prospects') }
      })
      .filter(Boolean)
    if (emailRows.length) {
      const { error } = await supabase.from('email_pipeline').insert(emailRows)
      if (error) throw error
    }

    const liRows = group
      .map(r => {
        const id = idBySerial.get(r.serial)
        if (!id) return null
        return {
          prospect_id: id,
          connection_status: clampEnum(r.connection_status, LINKEDIN_CONNECTION_STATUSES, 'Pending'),
          dm_status: clampEnum(r.dm_status, LINKEDIN_DM_STATUSES, 'Not Sent'),
          connection_sent_at: toIso(r.connection_sent_at),
          last_action_date: toIso(r.last_action_date),
        }
      })
      .filter(Boolean)
    if (liRows.length) {
      const { error } = await supabase.from('linkedin_pipeline').insert(liRows)
      if (error) throw error
    }

    const tagRows = group.flatMap(r => {
      const id = idBySerial.get(r.serial)
      if (!id || !r.tags?.length) return []
      return (r.tags ?? []).map(tag => ({ prospect_id: id, tag }))
    })
    if (tagRows.length) {
      const { error } = await supabase.from('prospect_tags').insert(tagRows)
      if (error) throw error
    }
  }

  // --- updates: refresh an existing prospect from its Notion page ------------
  //
  // Two rules keep a re-sync from destroying data:
  //
  //   1. A blank incoming value never overwrites a stored one. Notion not
  //      having an email does not mean the prospect has no email.
  //   2. A pipeline column is only touched when this row actually carried that
  //      side. blankRow() defaults email_stage to 'Prospects' and connection
  //      status to 'Pending', so writing those unconditionally would reset a
  //      real stage on every Notion-only row.
  async function updateGroup(group, existingById) {
    const merged = group.map(r => {
      const current = existingById.get(r._resolvedId)
      const patch = {
        id: r._resolvedId,
        serial: current.serial,
        notion_page_id: current.notion_page_id,
        notion_last_edited_at: r.notion_last_edited_at || current.notion_last_edited_at || null,
      }
      for (const field of REFRESHABLE_FIELDS) {
        const incoming = (r[field] ?? '').trim()
        patch[field] = incoming || current[field] || null
      }
      return patch
    })

    const { error: upErr } = await supabase.from('prospects').upsert(merged)
    if (upErr) throw upErr

    const ids = merged.map(m => m.id)

    // email_pipeline / linkedin_pipeline are separate rows that may not exist
    // for an older prospect, so find out before assuming an update will land.
    await syncPipeline({
      table: 'email_pipeline',
      rows: group.filter(r => r._emailKey),
      ids,
      valuesFor: r => ({ stage: clampEnum(r.email_stage, EMAIL_PIPELINE_STAGES, 'Prospects') }),
    })

    await syncPipeline({
      table: 'linkedin_pipeline',
      rows: group.filter(r => r._liKey),
      ids,
      valuesFor: r => ({
        connection_status: clampEnum(r.connection_status, LINKEDIN_CONNECTION_STATUSES, 'Pending'),
        dm_status: clampEnum(r.dm_status, LINKEDIN_DM_STATUSES, 'Not Sent'),
        connection_sent_at: toIso(r.connection_sent_at),
        last_action_date: toIso(r.last_action_date),
      }),
    })

    await addMissingTags(group)
  }

  async function syncPipeline({ table, rows, ids, valuesFor }) {
    if (!rows.length) return

    const { data: present, error: readErr } = await supabase
      .from(table)
      .select('prospect_id')
      .in('prospect_id', ids)
    if (readErr) throw readErr

    const havePipelineRow = new Set((present ?? []).map(p => p.prospect_id))

    const missing = rows.filter(r => !havePipelineRow.has(r._resolvedId))
    if (missing.length) {
      const { error } = await supabase
        .from(table)
        .insert(missing.map(r => ({ prospect_id: r._resolvedId, ...valuesFor(r) })))
      if (error) throw error
    }

    // One request per distinct set of values rather than per row.
    const existing = rows.filter(r => havePipelineRow.has(r._resolvedId))
    for (const [, sameValue] of groupBy(existing, r => JSON.stringify(valuesFor(r)))) {
      const { error } = await supabase
        .from(table)
        .update(valuesFor(sameValue[0]))
        .in('prospect_id', sameValue.map(r => r._resolvedId))
      if (error) throw error
    }
  }

  // Tags are additive on re-import: a tag added in Atom but absent from Notion
  // stays put. Removing tags is a deliberate act, not a side effect of syncing.
  async function addMissingTags(group) {
    const wanted = group.flatMap(r => (r.tags ?? []).map(tag => ({ prospect_id: r._resolvedId, tag })))
    if (!wanted.length) return

    const { error } = await supabase
      .from('prospect_tags')
      .upsert(wanted, { onConflict: 'prospect_id,tag', ignoreDuplicates: true })
    if (!error) return

    // 42P10 = no unique constraint matches the ON CONFLICT target. The index on
    // (prospect_id, tag) is optional in this schema (see supabase/policies.sql),
    // so fall back to read-then-insert exactly as useBulkActions does.
    if (error.code !== '42P10') throw error

    const ids = [...new Set(wanted.map(w => w.prospect_id))]
    const { data: present, error: readErr } = await supabase
      .from('prospect_tags')
      .select('prospect_id, tag')
      .in('prospect_id', ids)
    if (readErr) throw readErr

    const already = new Set((present ?? []).map(p => `${p.prospect_id} ${p.tag}`))
    const missing = wanted.filter(w => !already.has(`${w.prospect_id} ${w.tag}`))
    if (!missing.length) return

    const { error: insErr } = await supabase.from('prospect_tags').insert(missing)
    if (insErr) throw insErr
  }

  async function commit(rows) {
    const active = rows.filter(r => r.included)
    if (active.length === 0) return { error: 'Nothing selected to import.' }

    setCommitting(true)
    setError(null)
    setProgress({ done: 0, total: active.length })

    try {
      // Resolve identity at write time rather than trusting the badge computed
      // when the rows were pulled — someone else may have imported the same
      // page in between.
      const syncState = await fetchNotionSyncState(active.map(r => r.notion_page_id))

      const resolved = active.map(r => ({
        ...r,
        _resolvedId: r.notion_page_id ? syncState.get(r.notion_page_id)?.prospectId ?? null : null,
      }))

      const candidates = resolved.filter(r => r._resolvedId)

      // Full current values for the rows being updated, so blanks can coalesce.
      const existingById = new Map()
      for (const idGroup of chunk(candidates.map(r => r._resolvedId), 200)) {
        const { data, error: readErr } = await supabase
          .from('prospects')
          .select(['id', 'serial', 'notion_page_id', 'notion_last_edited_at', ...REFRESHABLE_FIELDS].join(', '))
          .in('id', idGroup)
        if (readErr) throw readErr
        for (const p of data ?? []) existingById.set(p.id, p)
      }

      // A prospect deleted between the two lookups comes back as an insert
      // rather than taking the whole batch down on a missing current row.
      const toUpdate = candidates.filter(r => existingById.has(r._resolvedId))
      const toInsert = resolved.filter(r => !existingById.has(r._resolvedId))

      let done = 0

      if (toInsert.length) {
        const { data: existing, error: fetchErr } = await supabase
          .from('prospects')
          .select('serial')
        if (fetchErr) throw fetchErr

        const prepared = assignSerials(toInsert, (existing ?? []).map(p => p.serial))
        for (const group of chunk(prepared, BATCH_SIZE)) {
          await insertGroup(group)
          done += group.length
          setProgress({ done, total: active.length })
        }
      }

      for (const group of chunk(toUpdate, BATCH_SIZE)) {
        await updateGroup(group, existingById)
        done += group.length
        setProgress({ done, total: active.length })
      }

      return {
        error: null,
        count: active.length,
        inserted: toInsert.length,
        updated: toUpdate.length,
      }
    } catch (err) {
      setError(err.message)
      return { error: err.message }
    } finally {
      setCommitting(false)
    }
  }

  return { commit, committing, progress, error }
}

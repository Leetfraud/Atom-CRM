import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { blocksToMarkdown } from '../utils/notion/blocksToMarkdown'

// Must stay <= MAX_BODY_IDS in supabase/functions/notion-proxy. Anything larger
// is silently trimmed by the proxy and those pages come back body-less.
const BODY_BATCH_SIZE = 40

// PostgREST puts .in() lists in the query string, so a 950-id lookup has to be
// split or the URL blows past what the server will accept.
const LOOKUP_CHUNK = 200

// What the database already knows about a set of Notion pages: which prospect
// each one became, and how fresh that prospect's copy is.
//
// Shared by the pull (to skip pages nobody has edited) and the commit (to
// decide update vs insert), so the two can never disagree about what "already
// imported" means.
export async function fetchNotionSyncState(pageIds) {
  const state = new Map()
  const ids = [...new Set((pageIds ?? []).filter(Boolean))]

  for (let i = 0; i < ids.length; i += LOOKUP_CHUNK) {
    const { data, error } = await supabase
      .from('prospects')
      .select('id, notion_page_id, notion_last_edited_at')
      .in('notion_page_id', ids.slice(i, i + LOOKUP_CHUNK))
    if (error) throw error

    for (const row of data ?? []) {
      state.set(row.notion_page_id, {
        prospectId: row.id,
        lastEditedAt: row.notion_last_edited_at,
      })
    }
  }

  return state
}

// A page needs its body re-read only if we have never imported it, or if Notion
// has touched it since we last did.
function hasChanged(page, known) {
  if (!known) return true
  if (!known.lastEditedAt || !page.last_edited_time) return true
  return new Date(page.last_edited_time).getTime() > new Date(known.lastEditedAt).getTime()
}

// ---------------------------------------------------------------------------
// Live Notion import.
//
// Pulling a database is two very differently priced operations, so they are two
// separate steps here rather than one "sync" call:
//
//   query_database  ~1 request per 100 rows. Fast, and on its own already gives
//                   every name, stage and tag.
//   page_bodies     >= 1 request per page, rate limited to about 3/second. For
//                   a 950-page database that is minutes, not seconds.
//
// So the bodies are fetched in batches with progress reported between them, and
// a caller that cancels or a page that fails still leaves a usable import: the
// contact is simply built from its properties with an empty body.
// ---------------------------------------------------------------------------
export function useNotionImport() {
  const [connected, setConnected] = useState(null) // null = not yet checked
  const [databases, setDatabases] = useState([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState(null)

  const callProxy = useCallback(async (body) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Your session has expired. Sign in again.')

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notion-proxy`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    )

    const json = await res.json().catch(() => ({}))

    // 428 is the proxy telling us there is no usable Notion token — a first-run
    // state, not a failure. The caller shows the connect prompt instead.
    if (res.status === 428) {
      setConnected(false)
      throw Object.assign(new Error(json.error ?? 'Notion is not connected'), { needsConnect: true })
    }
    if (!res.ok) throw new Error(json.error ?? `Notion request failed (${res.status})`)

    setConnected(true)
    return json
  }, [])

  // Doubles as the connection check: if this succeeds there is a live token.
  const loadDatabases = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { databases: list } = await callProxy({ action: 'list_databases' })
      setDatabases(list ?? [])
      return list ?? []
    } catch (err) {
      if (!err.needsConnect) setError(err.message)
      setDatabases([])
      return []
    } finally {
      setLoading(false)
    }
  }, [callProxy])

  // Pull one database into the { properties, markdown } shape parseNotionPages
  // expects.
  //
  // Querying the rows is cheap and always done in full. Reading page bodies is
  // not — so when skipUnchanged is on, that second pass is narrowed to the
  // pages Notion says have moved since the last import.
  const fetchDatabase = useCallback(async (databaseId, {
    withBodies = true,
    skipUnchanged = true,
  } = {}) => {
    setLoading(true)
    setError(null)
    setProgress({ done: 0, total: 0 })

    try {
      const { pages, truncated } = await callProxy({
        action: 'query_database',
        database_id: databaseId,
      })

      const rows = (pages ?? []).map(p => ({ ...p, markdown: '' }))
      const failures = []

      const syncState = await fetchNotionSyncState(rows.map(r => r.id))
      const changed = rows.filter(r => hasChanged(r, syncState.get(r.id)))
      const skipped = rows.length - changed.length

      // Unchanged pages are dropped from the import entirely rather than
      // imported body-less: re-writing them from properties alone would blank
      // nothing (the commit coalesces) but would still be pointless churn.
      const selected = skipUnchanged ? changed : rows
      const needBodies = withBodies ? selected : []

      if (needBodies.length) {
        setProgress({ done: 0, total: needBodies.length })
        const byId = new Map(needBodies.map(r => [r.id, r]))

        for (let i = 0; i < needBodies.length; i += BODY_BATCH_SIZE) {
          const batch = needBodies.slice(i, i + BODY_BATCH_SIZE)
          const { bodies } = await callProxy({
            action: 'page_bodies',
            page_ids: batch.map(r => r.id),
          })

          for (const body of bodies ?? []) {
            const row = byId.get(body.id)
            if (!row) continue
            if (body.error) failures.push({ id: body.id, error: body.error })
            row.markdown = blocksToMarkdown(body.blocks)
          }

          setProgress({
            done: Math.min(i + BODY_BATCH_SIZE, needBodies.length),
            total: needBodies.length,
          })
        }
      }

      return {
        pages: selected,
        syncState,
        truncated: !!truncated,
        failures,
        counts: {
          total: rows.length,
          changed: changed.length,
          skipped: skipUnchanged ? skipped : 0,
          known: syncState.size,
        },
      }
    } catch (err) {
      if (!err.needsConnect) setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [callProxy])

  return {
    connected,
    databases,
    loading,
    progress,
    error,
    loadDatabases,
    fetchDatabase,
    clearError: () => setError(null),
  }
}

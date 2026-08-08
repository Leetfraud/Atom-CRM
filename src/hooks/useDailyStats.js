import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const EMPTY_TOTALS = {
  emails_sent: 0, replies: 0, linkedin_dms: 0,
  docs_opened: 0, calls_booked: 0, closes: 0,
  cash_collected_usd: 0, revenue: 0
}

function computeTotals(data) {
  return data.reduce((acc, row) => ({
    emails_sent: acc.emails_sent + (row.emails_sent || 0),
    replies: acc.replies + (row.replies || 0),
    linkedin_dms: acc.linkedin_dms + (row.linkedin_dms || 0),
    docs_opened: acc.docs_opened + (row.docs_opened || 0),
    calls_booked: acc.calls_booked + (row.calls_booked || 0),
    closes: acc.closes + (row.closes || 0),
    cash_collected_usd: acc.cash_collected_usd + (row.cash_collected_usd || 0),
    revenue: acc.revenue + (row.revenue || 0),
  }), EMPTY_TOTALS)
}

// Returns a new row list with `updates` merged into the row for `date`.
function mergeRow(rows, date, updates) {
  const idx = rows.findIndex(r => r.date === date)
  if (idx === -1) {
    return [...rows, { date, ...updates }].sort((a, b) => a.date.localeCompare(b.date))
  }
  const next = rows.slice()
  next[idx] = { ...next[idx], ...updates }
  return next
}

export function useDailyStats(month = null) {
  const [dailyStats, setDailyStats] = useState([])
  const [monthlyTotals, setMonthlyTotals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Mirrors dailyStats so an edit can read the current rows without waiting for
  // a re-render — back-to-back cell edits would otherwise race on a stale copy.
  const statsRef = useRef([])

  useEffect(() => {
    fetchStats()
  }, [month])

  function applyStats(rows) {
    statsRef.current = rows
    setDailyStats(rows)
    setMonthlyTotals(computeTotals(rows))
  }

  async function fetchStats() {
    setLoading(true)
    try {
      let query = supabase
        .from('daily_stats')
        .select('*')
        .order('date', { ascending: true })

      if (month) {
        // month format: '2026-06'. Compute the range as plain strings — going
        // through Date() mixes UTC parsing with local getters and drops the
        // last day of the month for anyone not on UTC.
        const [year, mon] = month.split('-').map(Number)
        const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate()
        query = query
          .gte('date', `${month}-01`)
          .lte('date', `${month}-${String(lastDay).padStart(2, '0')}`)
      }

      const { data, error } = await query
      if (error) throw error

      applyStats(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Writes optimistically: the table and the totals row update on the spot and
   * the request goes out behind them. Refetching here instead would flip
   * `loading` on every single cell edit and remount the whole table.
   */
  async function upsertDailyStat(date, updates) {
    const before = statsRef.current.find(r => r.date === date)
    applyStats(mergeRow(statsRef.current, date, updates))

    const { error } = await supabase
      .from('daily_stats')
      .upsert({ date, ...updates }, { onConflict: 'date' })

    if (error) {
      // Roll back just the fields this call touched, so a slow failure can't
      // wipe out edits the user made to other cells in the meantime.
      const revert = Object.fromEntries(
        Object.keys(updates).map(field => [field, before?.[field] ?? 0])
      )
      applyStats(mergeRow(statsRef.current, date, revert))
      setError(error.message)
      return { error: error.message }
    }

    setError(null)
    return { error: null }
  }

  // Computed rates from totals
  const replyRate = monthlyTotals?.emails_sent > 0
    ? ((monthlyTotals.replies / monthlyTotals.emails_sent) * 100).toFixed(2)
    : '0.00'

  const closeRate = monthlyTotals?.calls_booked > 0
    ? ((monthlyTotals.closes / monthlyTotals.calls_booked) * 100).toFixed(2)
    : '0.00'

  const docOpenRate = monthlyTotals?.replies > 0
    ? ((monthlyTotals.docs_opened / monthlyTotals.replies) * 100).toFixed(2)
    : '0.00'

  return {
    dailyStats,
    monthlyTotals,
    replyRate,
    closeRate,
    docOpenRate,
    loading,
    error,
    upsertDailyStat,
    refetch: fetchStats
  }
}

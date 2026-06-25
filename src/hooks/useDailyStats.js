import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useDailyStats(month = null) {
  const [dailyStats, setDailyStats] = useState([])
  const [monthlyTotals, setMonthlyTotals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStats()
  }, [month])

  async function fetchStats() {
    setLoading(true)
    try {
      let query = supabase
        .from('daily_stats')
        .select('*')
        .order('date', { ascending: true })

      if (month) {
        // month format: '2026-06'
        const start = `${month}-01`
        const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0)
          .toISOString().split('T')[0]
        query = query.gte('date', start).lte('date', end)
      }

      const { data, error } = await query
      if (error) throw error

      setDailyStats(data)
      setMonthlyTotals(computeTotals(data))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
      reply_rate: 0, // computed below
      close_rate: 0,
    }), {
      emails_sent: 0, replies: 0, linkedin_dms: 0,
      docs_opened: 0, calls_booked: 0, closes: 0,
      cash_collected_usd: 0, revenue: 0
    })
  }

  async function upsertDailyStat(date, updates) {
    try {
      const { error } = await supabase
        .from('daily_stats')
        .upsert({ date, ...updates }, { onConflict: 'date' })
      if (error) throw error
      await fetchStats()
      return { error: null }
    } catch (err) {
      return { error: err.message }
    }
  }

  // Computed rates from totals
  const replyRate = monthlyTotals?.emails_sent > 0
    ? ((monthlyTotals.replies / monthlyTotals.emails_sent) * 100).toFixed(2)
    : '0.00'

  const closeRate = monthlyTotals?.calls_booked > 0
    ? ((monthlyTotals.closes / monthlyTotals.calls_booked) * 100).toFixed(2)
    : '0.00'

  return {
    dailyStats,
    monthlyTotals,
    replyRate,
    closeRate,
    loading,
    error,
    upsertDailyStat,
    refetch: fetchStats
  }
}
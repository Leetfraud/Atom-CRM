import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useTags() {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('tags')
      .select('name')
      .order('name')
      .then(({ data }) => {
        setTags((data ?? []).map(r => r.name))
        setLoading(false)
      })
  }, [])

  const createTag = useCallback(async (name) => {
    const trimmed = name.trim()
    if (!trimmed || tags.includes(trimmed)) return trimmed

    const { error } = await supabase
      .from('tags')
      .insert({ name: trimmed })

    if (!error) setTags(prev => [...prev, trimmed].sort())
    return trimmed
  }, [tags])

  return { tags, loading, createTag }
}
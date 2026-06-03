import { useEffect, useState } from 'react'
import { searchStations } from '../services/stationService'
import type { Station } from '../Types/settings'

// Debounced station search. Returns the controlled query plus result/loading/
// error state so any form can wire up a station autocomplete consistently.
export function useStationSearch(minChars = 1, debounceMs = 250) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Station[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const term = query.trim()
    if (term.length < minChars) {
      setResults([])
      setError('')
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    const handle = setTimeout(() => {
      searchStations(term)
        .then(data => {
          if (!active) return
          setResults(data)
          setError('')
        })
        .catch((e: unknown) => {
          if (!active) return
          setError(e instanceof Error ? e.message : 'Search failed')
          setResults([])
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, debounceMs)

    return () => {
      active = false
      clearTimeout(handle)
    }
  }, [query, minChars, debounceMs])

  return { query, setQuery, results, loading, error }
}

import { useCallback, useEffect, useState } from 'react'
import { HAS_SERVER } from '../lib/env.js'

// The curated song list (public/library.json; edited through the local server, read-only on GitHub Pages).
export function useLibrary() {
  const [library, setLibrary] = useState([])
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(
    () =>
      fetch(HAS_SERVER ? '/api/library' : `${import.meta.env.BASE_URL}library.json`)
        .then((r) => r.json())
        .then((l) => Array.isArray(l) && setLibrary(l))
        .catch(() => {})
        .finally(() => setLoaded(true)),
    [],
  )
  useEffect(() => { reload() }, [reload])

  const save = useCallback((next) => {
    setLibrary(next)
    if (HAS_SERVER) fetch('/api/library', { method: 'POST', body: JSON.stringify(next) }).catch(() => {})
  }, [])

  return { library, save, reload, loaded }
}

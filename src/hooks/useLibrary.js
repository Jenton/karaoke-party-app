import { useCallback, useEffect, useState } from 'react'

// The curated song list (saved on the laptop in data/library.json).
export function useLibrary() {
  const [library, setLibrary] = useState([])
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(
    () =>
      fetch('/api/library')
        .then((r) => r.json())
        .then((l) => Array.isArray(l) && setLibrary(l))
        .catch(() => {})
        .finally(() => setLoaded(true)),
    [],
  )
  useEffect(() => { reload() }, [reload])

  const save = useCallback((next) => {
    setLibrary(next)
    fetch('/api/library', { method: 'POST', body: JSON.stringify(next) }).catch(() => {})
  }, [])

  return { library, save, reload, loaded }
}

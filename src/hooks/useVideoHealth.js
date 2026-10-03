import { useCallback, useEffect, useState } from 'react'
import { cachedHealth, markBad, refreshHealth } from '../lib/videoHealth.js'

// Keeps a { videoId: status } map for every video in the library, refreshed in the background.
export function useVideoHealth(library) {
  const [health, setHealth] = useState(() => cachedHealth())
  const [checking, setChecking] = useState(false)

  const idsKey = library.flatMap((s) => [s.karaokeId, s.officialId, s.videoId]).filter(Boolean).join(',')

  const run = useCallback(
    async (force = false) => {
      const ids = idsKey ? [...new Set(idsKey.split(','))] : []
      if (!ids.length) return
      setChecking(true)
      try {
        setHealth(await refreshHealth(ids, { force }))
      } finally {
        setChecking(false)
      }
    },
    [idsKey],
  )

  useEffect(() => { run(false) }, [run])

  const reportBad = useCallback((id, status = 'blocked') => {
    markBad(id, status)
    setHealth((h) => ({ ...h, [id]: status }))
  }, [])

  return { health, checking, recheck: () => run(true), reportBad }
}

import { useCallback, useEffect, useState } from 'react'
import { cachedScan, scanLibrary } from '../lib/lyricsScan.js'

const HIDE_KEY = 'karaoke-hide-explicit'

// Background check of every song's lyrics for explicit words, plus the "hide explicit songs from kids" switch.
export function useLyricsScan(library) {
  const [scan, setScan] = useState(cachedScan)
  const [scanning, setScanning] = useState(false)
  const [hideExplicit, setHideState] = useState(() => {
    try { return localStorage.getItem(HIDE_KEY) !== 'off' } catch { return true }
  })
  const setHideExplicit = (v) => {
    setHideState(v)
    try { localStorage.setItem(HIDE_KEY, v ? 'on' : 'off') } catch { /* ignore */ }
  }

  const idsKey = library.map((s) => s.videoId).join(',')
  const run = useCallback(
    async (force = false) => {
      if (!library.length) return
      setScanning(true)
      try {
        await scanLibrary(library, { force, onResult: setScan })
        setScan(cachedScan())
      } finally {
        setScanning(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idsKey],
  )
  useEffect(() => { run(false) }, [run])

  return { scan, scanning, rescan: () => run(true), hideExplicit, setHideExplicit }
}

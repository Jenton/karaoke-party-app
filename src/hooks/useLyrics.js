import { useCallback, useEffect, useMemo, useState } from 'react'
import { findLyrics, parseLrc } from '../lib/lyrics.js'

// Lyrics state for the current song: auto-lookup, alternatives, timing offset, text size.
export function useLyrics(song, onChange) {
  const [matches, setMatches] = useState([])
  const [matchIdx, setMatchIdx] = useState(0)
  const [status, setStatus] = useState('')
  const [offset, setOffset] = useState(0) // seconds; + = lyrics appear later
  const [size, setSize] = useState(2)
  const [follow, setFollow] = useState(true)

  const lines = useMemo(() => parseLrc(song?.synced), [song?.synced])
  const apply = (m) => onChange({ lyrics: m.plain, synced: m.synced })

  const search = useCallback(async () => {
    if (!song) return
    setStatus('Searching… 🔍')
    try {
      const found = await findLyrics(song.title, song.artist)
      setMatches(found)
      setMatchIdx(0)
      if (found.length) {
        apply(found[0])
        setStatus(`Found: ${found[0].label}`)
      } else setStatus('No lyrics found. Try editing the song title, or paste them yourself.')
    } catch {
      setStatus("Couldn't reach the lyrics service (is the internet on?).")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id, song?.title, song?.artist])

  const tryNext = () => {
    if (!matches.length) return
    const i = (matchIdx + 1) % matches.length
    setMatchIdx(i)
    apply(matches[i])
    setStatus(`Match ${i + 1}/${matches.length}: ${matches[i].label}`)
  }

  // new song: reset, and look up lyrics automatically if it has none
  useEffect(() => {
    setMatches([]); setMatchIdx(0); setStatus(''); setOffset(0)
    if (song && !song.lyrics?.trim()) search()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id])

  return { song, lines, synced: follow && lines.length > 0, matches, status, offset, setOffset, size, setSize, follow, setFollow, search, tryNext }
}

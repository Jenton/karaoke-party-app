import { useCallback, useEffect, useMemo, useState } from 'react'
import { findLyrics, lyricsArtist, parseLrc } from '../lib/lyrics.js'

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
      const { matches: found, masked } = await findLyrics(song.title, song.artist)
      setMatches(found)
      setMatchIdx(0)
      if (found.length) {
        apply(found[0])
        setStatus(`Found: ${found[0].label}${masked ? ' (explicit words are shown as [bloop])' : ''}`)
      } else setStatus('No matching lyrics found. You can paste them yourself.')
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
    if (!song || song.lyrics?.trim()) return
    // without a real artist the lookup is a guess (KIDZ BOP covers), so wait for the host to ask
    if (lyricsArtist(song.artist)) search()
    else setStatus('No artist for this song, so lyrics are not looked up automatically. Tap Find lyrics to try, or paste your own.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id])

  return { song, lines, synced: follow && lines.length > 0, matches, status, offset, setOffset, size, setSize, follow, setFollow, search, tryNext }
}

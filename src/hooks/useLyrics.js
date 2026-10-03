import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { findLyrics, lyricsArtist, parseLrc } from '../lib/lyrics.js'

const OFFSETS_KEY = 'karaoke-lyrics-offsets-v1'
const NATIVE_KEY = 'karaoke-native-karaoke-lyrics'
const readOffsets = () => {
  try { return JSON.parse(localStorage.getItem(OFFSETS_KEY)) || {} } catch { return {} }
}
const writeOffset = (id, value) => {
  try { localStorage.setItem(OFFSETS_KEY, JSON.stringify({ ...readOffsets(), [id]: value })) } catch { /* ignore */ }
}

// Lyrics state for the current song: auto-lookup, alternatives, timing, text size.
//  - picks the lyrics version whose length best matches the video's length (so their timings line up)
//  - remembers any timing correction per video, so you only fix a video once
//  - `native`: karaoke videos already show their own synced lyrics, so the app can stay out of the way
export function useLyrics(song, onChange, { getTime = () => 0, getDuration = () => 0 } = {}) {
  const [matches, setMatches] = useState([])
  const [matchIdx, setMatchIdx] = useState(0)
  const [status, setStatus] = useState('')
  const [offset, setOffsetState] = useState(0) // seconds; + = lyrics appear later
  const [size, setSize] = useState(2)
  const [follow, setFollow] = useState(true)
  const [videoLen, setVideoLen] = useState(0)
  const [nativeKaraoke, setNativeKaraokeState] = useState(() => {
    try { return localStorage.getItem(NATIVE_KEY) !== 'off' } catch { return true }
  })
  const setNativeKaraoke = (v) => {
    setNativeKaraokeState(v)
    try { localStorage.setItem(NATIVE_KEY, v ? 'on' : 'off') } catch { /* ignore */ }
  }
  const nativeActive = !!song && nativeKaraoke && song.version === 'karaoke' && !!song.karaokeId && song.videoId === song.karaokeId

  const lines = useMemo(() => parseLrc(song?.synced), [song?.synced])
  const apply = (m) => onChange({ lyrics: m.plain, synced: m.synced })

  const setOffset = (fn) =>
    setOffsetState((prev) => {
      const v = Math.round((typeof fn === 'function' ? fn(prev) : fn) * 10) / 10
      if (song?.videoId) writeOffset(song.videoId, v)
      return v
    })

  // tap-to-sync: call this the moment the first words are sung
  const syncNow = () => {
    const first = lines.find((l) => l.text?.trim())
    if (!first) return false
    setOffset(getTime() - first.t)
    return true
  }

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
    setMatches([]); setMatchIdx(0); setStatus('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id])
  useEffect(() => {
    if (!song || song.lyrics?.trim() || nativeActive) return
    // without a real artist the lookup is a guess (KIDZ BOP covers), so wait for the host to ask
    if (lyricsArtist(song.artist)) search()
    else setStatus('No artist for this song, so lyrics are not looked up automatically. Tap Find lyrics to try, or paste your own.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id, nativeActive])

  // the saved timing correction for this particular video
  useEffect(() => {
    setOffsetState(song?.videoId ? readOffsets()[song.videoId] ?? 0 : 0)
  }, [song?.videoId])

  // how long is the video? (known a moment after it loads)
  const tries = useRef(0)
  useEffect(() => {
    setVideoLen(0)
    tries.current = 0
    if (!song?.videoId) return
    const id = setInterval(() => {
      const d = getDuration()
      if (d > 0) { setVideoLen(d); clearInterval(id) } else if (++tries.current > 60) clearInterval(id)
    }, 500)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.videoId])

  // once both lengths are known, use the lyrics whose length is closest to the video's
  const cur = matches[matchIdx]
  const timingNote = useMemo(() => {
    if (!videoLen || !cur?.duration || !cur.synced) return ''
    const diff = videoLen - cur.duration
    return Math.abs(diff) > 12
      ? `This video is ${Math.abs(Math.round(diff))}s ${diff > 0 ? 'longer' : 'shorter'} than the track the lyrics were timed to, so the timing may be off. Use 🎯 Sync below.`
      : ''
  }, [videoLen, cur])
  useEffect(() => {
    if (!videoLen || matches.length < 2) return
    const synced = matches.filter((m) => m.synced && m.duration)
    if (!synced.length) return
    const best = synced.reduce((a, b) => (Math.abs(b.duration - videoLen) < Math.abs(a.duration - videoLen) ? b : a))
    const here = matches[matchIdx]
    if (best !== here && (!here?.duration || Math.abs(here.duration - videoLen) - Math.abs(best.duration - videoLen) > 2)) {
      setMatchIdx(matches.indexOf(best))
      apply(best)
      setStatus(`Picked the lyrics that best match this video's length: ${best.label}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoLen, matches])

  return {
    song, lines, synced: follow && lines.length > 0, matches, status, timingNote,
    offset, setOffset, syncNow, size, setSize, follow, setFollow, search, tryNext,
    nativeKaraoke, setNativeKaraoke, nativeActive,
  }
}

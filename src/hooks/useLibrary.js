import { useCallback, useEffect, useRef, useState } from 'react'
import { HAS_SERVER } from '../lib/env.js'
import { supabase } from '../lib/supabase.js'

const LOCAL_KEY = 'karaoke-library-edits-v2'
const CACHE_KEY = 'karaoke-library-cache-v2'
const OVR_KEY = 'karaoke-id-overrides-v1' // replacement videos you picked: { songKey: { karaokeId?, officialId? } }

const readJson = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
const writeJson = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

const readEdits = () => {
  const e = readJson(LOCAL_KEY, {})
  return { added: e.added ?? [], removed: e.removed ?? [] }
}

const applyOverrides = (list) => {
  const o = readJson(OVR_KEY, {})
  return list.map((s) => (o[s.videoId] ? { ...s, ...o[s.videoId] } : s))
}

// base list + this browser's edits (added/renamed songs, removed songs)
const applyEdits = (base, { added, removed }) => {
  const byId = new Map(added.map((s) => [s.videoId, s]))
  const kept = base.filter((s) => !removed.includes(s.videoId)).map((s) => byId.get(s.videoId) ?? s)
  const baseIds = new Set(base.map((s) => s.videoId))
  return [...kept, ...added.filter((s) => !baseIds.has(s.videoId))]
}

const FIELDS = ['title', 'artist', 'genre', 'karaokeId', 'officialId']
const sameSong = (a, b) => a && b && FIELDS.every((f) => (a[f] ?? '') === (b[f] ?? ''))
const fromRow = (r) => ({
  videoId: r.video_id,
  title: r.title,
  ...(r.artist ? { artist: r.artist } : {}),
  ...(r.genre ? { genre: r.genre } : {}),
  ...(r.karaoke_id ? { karaokeId: r.karaoke_id } : {}),
  ...(r.official_id ? { officialId: r.official_id } : {}),
})
const toRow = (s, extras) => ({
  video_id: s.videoId,
  title: s.title,
  ...(extras ? { artist: s.artist ?? null, genre: s.genre ?? null, karaoke_id: s.karaokeId ?? null, official_id: s.officialId ?? null } : {}),
})

// The curated song list. Where it lives, in order of preference:
//  1. Supabase database (if VITE_SUPABASE_* is set): shared by every device, same list at any location.
//     Reads are public; editing needs a sign-in. The last list is cached for flaky party Wi-Fi.
//  2. Local dev server: saved into public/library.json.
//  3. Public static build without a database: public/library.json plus per-browser edits (localStorage).
export function useLibrary() {
  const [library, setLibraryState] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const current = useRef([])
  const base = useRef([])
  const dbOk = useRef(false)
  const artistCol = useRef(true) // false if the database was created before the artist column existed
  const [starters, setStarters] = useState([])
  const meta = useRef(new Map()) // videoId -> { artist, genre, karaokeId, officialId } from the bundled list, for songs saved without them

  const setLibrary = (list) => {
    const withOverrides = applyOverrides(list)
    current.current = withOverrides
    setLibraryState(withOverrides)
  }

  const loadFile = useCallback(async () => {
    const r = await fetch(HAS_SERVER ? '/api/library' : `${import.meta.env.BASE_URL}library.json`)
    const list = await r.json()
    if (!Array.isArray(list)) throw new Error('bad library')
    base.current = list
    return list
  }, [])

  const reload = useCallback(async () => {
    try {
      if (supabase) {
        try {
          let res = await supabase.from('songs').select('video_id,title,artist,genre,karaoke_id,official_id').order('created_at')
          if (res.error && /artist|genre|karaoke_id|official_id/i.test(res.error.message)) {
            artistCol.current = false
            res = await supabase.from('songs').select('video_id,title').order('created_at')
          }
          const { data, error: err } = res
          if (err) throw err
          const list = data.map(fromRow).map((s) => ({ ...s, ...meta.current.get(s.videoId) }))
          dbOk.current = true
          writeJson(CACHE_KEY, list)
          setLibrary(list)
          setError('')
          return
        } catch {
          dbOk.current = false
          setError("Can't reach the song database right now, showing the last saved list.")
          const cached = readJson(CACHE_KEY, null)
          if (cached) return setLibrary(cached)
          return setLibrary(await loadFile())
        }
      }
      const list = await loadFile()
      setLibrary(HAS_SERVER ? list : applyEdits(list, readEdits()))
    } catch {
      /* keep what we have */
    } finally {
      setLoaded(true)
    }
  }, [loadFile])

  useEffect(() => {
    // the bundled list first (so artists can be filled in), then the database
    const start = supabase ? loadFile().catch(() => []) : Promise.resolve([])
    start.then((list) => {
      meta.current = new Map(list.map((s) => [s.videoId, Object.fromEntries(['artist', 'genre', 'karaokeId', 'officialId', 'explicit'].filter((f) => s[f]).map((f) => [f, s[f]]))]))
      setStarters(list)
      reload()
    })
  }, [loadFile, reload])

  const save = useCallback(
    async (next) => {
      const prev = current.current
      // remember replacement videos (different from the bundled list) on this device, so they stick
      const ovr = {}
      for (const song of next) {
        const m = meta.current.get(song.videoId)
        if (!m) continue
        const diff = {}
        if (song.karaokeId && song.karaokeId !== m.karaokeId) diff.karaokeId = song.karaokeId
        if (song.officialId && song.officialId !== m.officialId) diff.officialId = song.officialId
        if (Object.keys(diff).length) ovr[song.videoId] = diff
      }
      writeJson(OVR_KEY, ovr)
      setLibrary(next)

      if (supabase) {
        const prevById = new Map(prev.map((s) => [s.videoId, s]))
        const upserts = next
          .filter((s) => !sameSong(prevById.get(s.videoId), s))
          .map((s) => toRow(s, artistCol.current))
        const removed = prev.filter((s) => !next.some((n) => n.videoId === s.videoId)).map((s) => s.videoId)
        try {
          if (upserts.length) {
            const { error: err } = await supabase.from('songs').upsert(upserts)
            if (err) throw err
          }
          if (removed.length) {
            const { error: err } = await supabase.from('songs').delete().in('video_id', removed)
            if (err) throw err
          }
          writeJson(CACHE_KEY, next)
          setError('')
          return true
        } catch (e) {
          setError(`Couldn't save to the database (${e.message}). Are you signed in?`)
          reload()
          return false
        }
      }

      if (HAS_SERVER) {
        fetch('/api/library', { method: 'POST', body: JSON.stringify(next) }).catch(() => {})
        return true
      }
      const baseById = new Map(base.current.map((s) => [s.videoId, s]))
      writeJson(LOCAL_KEY, {
        added: next.filter((s) => !sameSong(baseById.get(s.videoId), s)),
        removed: base.current.filter((s) => !next.some((n) => n.videoId === s.videoId)).map((s) => s.videoId),
      })
      return true
    },
    [reload],
  )

  // Starter songs (public/library.json) that aren't in the database yet
  const missingStarters = starters.filter((s) => !library.some((l) => l.videoId === s.videoId))
  const addStarters = useCallback(() => save([...current.current, ...missingStarters]), [save, missingStarters])

  // change fields of one song using the latest list (safe to call several times in a row)
  const patchSong = useCallback((key, patch) => save(current.current.map((x) => (x.videoId === key ? { ...x, ...patch } : x))), [save])

  const addSongs = useCallback((list) => save([...current.current, ...list]), [save])

  return { library, save, reload, loaded, error, missingStarters, addStarters, addSongs, patchSong, starters, usingDb: !!supabase }
}

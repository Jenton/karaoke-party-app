import { useCallback, useEffect, useRef, useState } from 'react'
import { HAS_SERVER } from '../lib/env.js'
import { supabase } from '../lib/supabase.js'

const LOCAL_KEY = 'karaoke-library-edits'
const CACHE_KEY = 'karaoke-library-cache'

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

// base list + this browser's edits (added/renamed songs, removed songs)
const applyEdits = (base, { added, removed }) => {
  const byId = new Map(added.map((s) => [s.videoId, s]))
  const kept = base.filter((s) => !removed.includes(s.videoId)).map((s) => byId.get(s.videoId) ?? s)
  const baseIds = new Set(base.map((s) => s.videoId))
  return [...kept, ...added.filter((s) => !baseIds.has(s.videoId))]
}

const toRow = (s) => ({ video_id: s.videoId, title: s.title })
const fromRow = (r) => ({ videoId: r.video_id, title: r.title })

// The curated song list. Where it lives, in order of preference:
//  1. Supabase database (if VITE_SUPABASE_* is set): shared by every device, same list at any location.
//     Reads are public; editing needs a grown-up sign-in. The last list is cached for flaky party Wi-Fi.
//  2. Local dev server: saved into public/library.json.
//  3. Public static build without a database: public/library.json plus per-browser edits (localStorage).
export function useLibrary() {
  const [library, setLibraryState] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const current = useRef([])
  const base = useRef([])
  const dbOk = useRef(false)

  const setLibrary = (list) => {
    current.current = list
    setLibraryState(list)
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
          const { data, error: err } = await supabase.from('songs').select('video_id,title').order('created_at')
          if (err) throw err
          const list = data.map(fromRow)
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

  useEffect(() => { reload() }, [reload])

  const save = useCallback(
    async (next) => {
      const prev = current.current
      setLibrary(next)

      if (supabase) {
        const prevTitles = new Map(prev.map((s) => [s.videoId, s.title]))
        const upserts = next.filter((s) => prevTitles.get(s.videoId) !== s.title).map(toRow)
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
        } catch (e) {
          setError(`Couldn't save to the database (${e.message}). Are you signed in?`)
          reload()
        }
        return
      }

      if (HAS_SERVER) {
        fetch('/api/library', { method: 'POST', body: JSON.stringify(next) }).catch(() => {})
        return
      }
      const baseById = new Map(base.current.map((s) => [s.videoId, s]))
      writeJson(LOCAL_KEY, {
        added: next.filter((s) => baseById.get(s.videoId)?.title !== s.title),
        removed: base.current.filter((s) => !next.some((n) => n.videoId === s.videoId)).map((s) => s.videoId),
      })
    },
    [reload],
  )

  // Copy the starter songs from public/library.json into an empty database.
  const seed = useCallback(async () => {
    const list = await loadFile()
    await save(list)
  }, [loadFile, save])

  return { library, save, reload, loaded, error, seed, usingDb: !!supabase }
}

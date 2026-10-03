import { useCallback, useEffect, useRef, useState } from 'react'
import { HAS_SERVER } from '../lib/env.js'

const LOCAL_KEY = 'karaoke-library-edits'

const readEdits = () => {
  try {
    const e = JSON.parse(localStorage.getItem(LOCAL_KEY))
    return { added: e?.added ?? [], removed: e?.removed ?? [] }
  } catch {
    return { added: [], removed: [] }
  }
}

// base list + this browser's edits (added/renamed songs, removed songs)
const applyEdits = (base, { added, removed }) => {
  const byId = new Map(added.map((s) => [s.videoId, s]))
  const kept = base.filter((s) => !removed.includes(s.videoId)).map((s) => byId.get(s.videoId) ?? s)
  const baseIds = new Set(base.map((s) => s.videoId))
  return [...kept, ...added.filter((s) => !baseIds.has(s.videoId))]
}

// The curated song list.
//  - Running locally: saved by the dev server into public/library.json.
//  - Public GitHub Pages build: public/library.json is the shared base, and songs you add/rename/remove
//    in the app are remembered in this browser (localStorage) on top of it.
export function useLibrary() {
  const [library, setLibrary] = useState([])
  const [loaded, setLoaded] = useState(false)
  const base = useRef([])

  const reload = useCallback(
    () =>
      fetch(HAS_SERVER ? '/api/library' : `${import.meta.env.BASE_URL}library.json`)
        .then((r) => r.json())
        .then((l) => {
          if (!Array.isArray(l)) return
          base.current = l
          setLibrary(HAS_SERVER ? l : applyEdits(l, readEdits()))
        })
        .catch(() => {})
        .finally(() => setLoaded(true)),
    [],
  )
  useEffect(() => { reload() }, [reload])

  const save = useCallback((next) => {
    setLibrary(next)
    if (HAS_SERVER) {
      fetch('/api/library', { method: 'POST', body: JSON.stringify(next) }).catch(() => {})
      return
    }
    const baseById = new Map(base.current.map((s) => [s.videoId, s]))
    const edits = {
      added: next.filter((s) => baseById.get(s.videoId)?.title !== s.title),
      removed: base.current.filter((s) => !next.some((n) => n.videoId === s.videoId)).map((s) => s.videoId),
    }
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(edits)) } catch { /* ignore */ }
  }, [])

  return { library, save, reload, loaded }
}

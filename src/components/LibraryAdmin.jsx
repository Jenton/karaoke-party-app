import { useEffect, useState } from 'react'
import { displayTitle, parseYouTubeId } from '../lib/youtube.js'

// Grown-ups only: build the curated song list from YouTube search, a playlist, or a pasted link.
export default function LibraryAdmin({ library, save }) {
  const [enabled, setEnabled] = useState(null) // is a YouTube API key configured?
  const [mode, setMode] = useState('search')
  const [query, setQuery] = useState('kidz bop karaoke')
  const [playlist, setPlaylist] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [link, setLink] = useState('')
  const [linkTitle, setLinkTitle] = useState('')

  useEffect(() => {
    fetch('/api/youtube/status').then((r) => r.json()).then((d) => setEnabled(d.enabled)).catch(() => setEnabled(false))
  }, [])

  const have = new Set(library.map((s) => s.videoId))
  const add = (items) => {
    const fresh = items.filter((i) => !have.has(i.videoId)).map((i) => ({ videoId: i.videoId, title: displayTitle(i.title) }))
    if (fresh.length) save([...library, ...fresh])
  }

  const run = async (url) => {
    setBusy(true); setError(''); setResults([])
    try {
      const r = await fetch(url)
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Something went wrong')
      setResults(data)
      if (!data.length) setError('Nothing found (videos that can\'t be embedded are skipped).')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const addLink = (e) => {
    e.preventDefault()
    const videoId = parseYouTubeId(link)
    if (!videoId) return setError("That doesn't look like a YouTube link.")
    if (!linkTitle.trim()) return setError('Give it a title.')
    add([{ videoId, title: linkTitle.trim() }])
    setLink(''); setLinkTitle(''); setError('')
  }

  const rename = (s) => {
    const title = window.prompt('Song title', s.title)
    if (title?.trim()) save(library.map((x) => (x.videoId === s.videoId ? { ...x, title: title.trim() } : x)))
  }

  const tab = (id, label) => (
    <button className={`big-btn !py-2 !text-base ${mode === id ? 'bg-violet-600 text-white' : 'bg-violet-100'}`} onClick={() => { setMode(id); setError('') }}>{label}</button>
  )

  return (
    <section className="card space-y-3">
      <h2 className="text-2xl font-bold text-violet-700">📚 Song library ({library.length})</h2>

      <div className="flex gap-2">{tab('search', 'YouTube search')}{tab('playlist', 'Playlist')}{tab('link', 'Paste link')}</div>

      {mode !== 'link' && enabled === false && (
        <p className="text-rose-600 text-sm">
          No YouTube API key found. Put <code>YOUTUBE_API_KEY=…</code> in a <code>.env</code> file and restart <code>npm run dev</code>. (Or use “Paste link”.)
        </p>
      )}

      {mode === 'search' && (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run('/api/youtube/search?q=' + encodeURIComponent(query)) }}>
          <input className="field" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="big-btn !py-2 bg-pink-500 text-white" disabled={busy || !enabled}>Search</button>
        </form>
      )}
      {mode === 'playlist' && (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run('/api/youtube/playlist?id=' + encodeURIComponent(playlist)) }}>
          <input className="field" placeholder="Playlist link or ID" value={playlist} onChange={(e) => setPlaylist(e.target.value)} />
          <button className="big-btn !py-2 bg-pink-500 text-white" disabled={busy || !enabled || !playlist.trim()}>Load</button>
        </form>
      )}
      {mode === 'link' && (
        <form className="space-y-2" onSubmit={addLink}>
          <input className="field" placeholder="YouTube link" value={link} onChange={(e) => setLink(e.target.value)} />
          <input className="field" placeholder="Song title" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} />
          <button className="big-btn !py-2 w-full bg-pink-500 text-white">Add to library</button>
        </form>
      )}

      {busy && <p>Loading… ⏳</p>}
      {error && <p className="text-rose-600 font-semibold">{error}</p>}

      {results.length > 0 && (
        <>
          <button className="big-btn !py-2 !text-base w-full bg-green-500 text-white" onClick={() => add(results)}>
            ＋ Add all {results.filter((r) => !have.has(r.videoId)).length} new songs
          </button>
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((r) => (
              <li key={r.videoId} className="flex items-center gap-2 bg-slate-100 rounded-xl p-2">
                <img alt="" src={`https://i.ytimg.com/vi/${r.videoId}/default.jpg`} className="w-16 h-12 rounded object-cover" />
                <span className="flex-1 min-w-0 text-sm leading-tight">{displayTitle(r.title)}<br /><span className="text-slate-500 text-xs truncate block">{r.title}</span></span>
                <button className="big-btn !py-1 !px-3 !text-base bg-green-400" disabled={have.has(r.videoId)} onClick={() => add([r])}>
                  {have.has(r.videoId) ? '✓' : '＋'}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {library.length > 0 && (
        <details>
          <summary className="cursor-pointer font-bold">Manage saved songs</summary>
          <ul className="space-y-1 mt-2 max-h-72 overflow-y-auto">
            {library.map((s) => (
              <li key={s.videoId} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{s.title}</span>
                <button aria-label="Rename" onClick={() => rename(s)}>✏️</button>
                <button aria-label="Remove" onClick={() => save(library.filter((x) => x.videoId !== s.videoId))}>🗑️</button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

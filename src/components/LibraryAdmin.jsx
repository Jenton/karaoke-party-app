import { useEffect, useState } from 'react'
import { HAS_SERVER } from '../lib/env.js'
import { displayTitle, parseYouTubeId } from '../lib/youtube.js'

// Grown-ups only: build the curated song list from YouTube search, a playlist, or a pasted link.
function SignIn({ auth }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    setMsg(await auth.signIn(email, password))
  }
  return (
    <form onSubmit={submit} className="space-y-2">
      <p className="text-sm text-slate-600">Sign in to change the song library. (Everyone can still pick songs.)</p>
      <input className="field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
      <input className="field" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      {msg && <p className="text-rose-600 text-sm">{msg}</p>}
      <button className="big-btn !py-2 w-full bg-violet-600 text-white">Sign in</button>
    </form>
  )
}

export default function LibraryAdmin({ library, save, auth, usingDb, canEdit = true, dbError, seed }) {
  const [enabled, setEnabled] = useState(null) // is a YouTube API key configured?
  const [mode, setMode] = useState(HAS_SERVER ? 'search' : 'link')
  const [query, setQuery] = useState('kidz bop karaoke')
  const [playlist, setPlaylist] = useState('https://www.youtube.com/playlist?list=PL5pvzdXbuo274HniZxrytCoUs44IjLUuX') // official KIDZ BOP Karaoke playlist
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [link, setLink] = useState('')
  const [linkTitle, setLinkTitle] = useState('')

  useEffect(() => {
    if (!HAS_SERVER) return
    fetch('/api/youtube/status').then((r) => r.json()).then((d) => setEnabled(d.enabled)).catch(() => setEnabled(false))
  }, [])

  // fill in the title automatically when a link is pasted (best effort)
  useEffect(() => {
    const id = parseYouTubeId(link)
    if (!id || linkTitle) return
    let stale = false
    fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}`)
      .then((r) => r.json())
      .then((d) => !stale && d.title && setLinkTitle((t) => t || displayTitle(d.title)))
      .catch(() => {})
    return () => { stale = true }
  }, [link]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (have.has(videoId)) return setError('That song is already in the library.')
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

  if (!canEdit) {
    return (
      <section className="card space-y-3">
        <h2 className="text-2xl font-bold text-violet-700">📚 Song library ({library.length})</h2>
        {dbError && <p className="text-amber-700 text-sm">{dbError}</p>}
        <SignIn auth={auth} />
      </section>
    )
  }

  return (
    <section className="card space-y-3">
      <h2 className="text-2xl font-bold text-violet-700">📚 Song library ({library.length})</h2>
      {usingDb && (
        <p className="text-sm text-slate-600">
          Saved to the shared song database ✅{auth?.session?.user?.email ? ` · ${auth.session.user.email} · ` : ' · '}
          <button className="underline" onClick={auth.signOut}>sign out</button>
        </p>
      )}
      {dbError && <p className="text-amber-700 text-sm">{dbError}</p>}
      {usingDb && library.length === 0 && seed && (
        <button className="big-btn !py-2 w-full bg-green-500 text-white" onClick={seed}>Copy the starter songs into the database</button>
      )}

      {HAS_SERVER ? (
        <div className="flex gap-2">{tab('search', 'YouTube search')}{tab('playlist', 'Playlist')}{tab('link', 'Paste link')}</div>
      ) : (
        !usingDb && <p className="text-sm text-slate-600">On this public page, songs you add are saved in this browser only. (YouTube search/import and sharing the list need the laptop version.)</p>
      )}

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
          {parseYouTubeId(link) && (
            <img alt="" src={`https://i.ytimg.com/vi/${parseYouTubeId(link)}/mqdefault.jpg`} className="w-40 rounded-lg" />
          )}
          <input className="field" placeholder="Song title (filled in automatically if possible)" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} />
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

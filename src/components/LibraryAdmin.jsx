import { useEffect, useState } from 'react'
import { HAS_SERVER } from '../lib/env.js'
import { ytEnabled, ytSearch, ytPlaylist } from '../lib/ytApi.js'
import { GROUPS } from '../lib/genres.js'
import { displayTitle, parseYouTubeId } from '../lib/youtube.js'
import { mergeSongs, parseSongList } from '../lib/importSongs.js'

// Build the curated song list from YouTube search, a playlist, or a pasted link.
export function SignIn({ auth }) {
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

export default function LibraryAdmin({ library, save, auth, usingDb, canEdit = true, dbError, missingStarters = [], addStarters }) {
  const [enabled, setEnabled] = useState(null) // is a YouTube API key configured?
  const [mode, setMode] = useState('link')
  const [query, setQuery] = useState('kidz bop karaoke')
  const [playlist, setPlaylist] = useState('https://www.youtube.com/playlist?list=PL5pvzdXbuo274HniZxrytCoUs44IjLUuX') // official KIDZ BOP Karaoke playlist
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [link, setLink] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkArtist, setLinkArtist] = useState('')
  const [linkGenre, setLinkGenre] = useState('')
  const [linkKind, setLinkKind] = useState('official')
  const [jsonText, setJsonText] = useState('')
  const [jsonMsg, setJsonMsg] = useState('')

  useEffect(() => {
    ytEnabled().then((on) => { setEnabled(on); if (on) setMode((m) => (m === 'link' ? 'search' : m)) })
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
    const fresh = items
      .filter((i) => !have.has(i.videoId))
      .map((i) => {
        const title = i.artist !== undefined ? i.title : displayTitle(i.title)
        const kind = i.kind ?? (/karaoke|instrumental/i.test(i.title) ? 'karaoke' : 'official')
        return {
          videoId: i.videoId,
          title: title.replace(/\s*[([]?(karaoke version|official video|official music video)[)\]]?\s*$/i, '').trim() || title,
          ...(i.artist ? { artist: i.artist } : {}),
          genre: i.genre || (kind === 'karaoke' ? 'Karaoke' : undefined),
          ...(kind === 'karaoke' ? { karaokeId: i.videoId } : { officialId: i.videoId }),
        }
      })
    if (fresh.length) save([...library, ...fresh])
  }

  const run = async (load) => {
    setBusy(true); setError(''); setResults([])
    try {
      const data = await load()
      setResults(data)
      if (!data.length) setError('Nothing found (videos that can\'t be embedded are skipped).')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const importJson = (e) => {
    e.preventDefault()
    const { songs, skipped, error } = parseSongList(jsonText)
    if (error) return setJsonMsg(error)
    if (!songs.length) return setJsonMsg('No usable songs found (each needs a title and a YouTube id).')
    const { library: merged, added, updated } = mergeSongs(library, songs)
    save(merged)
    setJsonMsg(`✅ Added ${added} new song${added === 1 ? '' : 's'}${updated ? `, filled in ${updated} existing` : ''}${skipped ? `. Skipped ${skipped} row(s) without a valid title/video id` : ''}.`)
    setJsonText('')
  }

  const addLink = (e) => {
    e.preventDefault()
    const videoId = parseYouTubeId(link)
    if (!videoId) return setError("That doesn't look like a YouTube link.")
    if (!linkTitle.trim()) return setError('Give it a title.')
    if (have.has(videoId)) return setError('That song is already in the library.')
    add([{ videoId, title: linkTitle.trim(), artist: linkArtist.trim(), genre: linkGenre, kind: linkKind }])
    setLink(''); setLinkTitle(''); setLinkArtist(''); setLinkGenre(''); setError('')
  }

  const tab = (id, label) => (
    <button className={`big-btn !py-2 !text-base ${mode === id ? 'bg-violet-600 text-white' : 'bg-violet-100'}`} onClick={() => { setMode(id); setError('') }}>{label}</button>
  )

  if (!canEdit) {
    return (
      <section className="card space-y-3">
        <h2 className="text-2xl font-bold text-violet-700">➕ Add songs to the library</h2>
        {dbError && <p className="text-amber-700 text-sm">{dbError}</p>}
        <SignIn auth={auth} />
      </section>
    )
  }

  return (
    <section className="card space-y-3">
      <h2 className="text-2xl font-bold text-violet-700">➕ Add songs to the library</h2>
      {usingDb && (
        <p className="text-sm text-slate-600">
          Saved to the shared song database ✅{auth?.session?.user?.email ? ` · ${auth.session.user.email} · ` : ' · '}
          <button className="underline" onClick={auth.signOut}>sign out</button>
        </p>
      )}
      {dbError && <p className="text-amber-700 text-sm">{dbError}</p>}
      {usingDb && missingStarters.length > 0 && addStarters && (
        <button className="big-btn !py-2 w-full bg-green-500 text-white" onClick={addStarters}>
          ＋ Add {missingStarters.length} starter songs to the library
        </button>
      )}

      {enabled ? (
        <div className="flex flex-wrap gap-2">{tab('search', 'YouTube search')}{tab('playlist', 'Playlist')}{tab('link', 'Paste link')}{tab('json', 'Paste list')}</div>
      ) : (
        <div className="flex flex-wrap gap-2">{tab('link', 'Paste link')}{tab('json', 'Paste list')}</div>
      )}
      {!HAS_SERVER && !usingDb && (
        <p className="text-sm text-slate-600">On this public page, songs you add are saved in this browser only. (Connect the shared database to keep and share the list.)</p>
      )}

      {enabled === false && (
        <p className="text-slate-600 text-sm">
          YouTube search isn't set up yet (see the README: “YouTube API key”). You can still paste links or lists.
        </p>
      )}

      {mode === 'search' && (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(() => ytSearch(query)) }}>
          <input className="field" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="big-btn !py-2 bg-pink-500 text-white" disabled={busy || !enabled}>Search</button>
        </form>
      )}
      {mode === 'playlist' && (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(() => ytPlaylist(playlist)) }}>
          <input className="field" placeholder="Playlist link or ID" value={playlist} onChange={(e) => setPlaylist(e.target.value)} />
          <button className="big-btn !py-2 bg-pink-500 text-white" disabled={busy || !enabled || !playlist.trim()}>Load</button>
        </form>
      )}
      {mode === 'json' && (
        <form className="space-y-2" onSubmit={importJson}>
          <p className="text-sm text-slate-600">
            Paste a JSON list of songs. Rows for the same song's karaoke and original videos are merged into one entry. Each row needs a
            <code> title</code> and a <code>youtubeId</code> (or <code>karaokeId</code> / <code>officialId</code>); <code>artist</code> and <code>genre</code> are optional. Ids ending in <code>-kar</code> or titles saying "Karaoke" are treated as karaoke videos.
          </p>
          <textarea className="field h-40 font-mono text-xs" placeholder='[{"title":"Roar","artist":"Katy Perry","youtubeId":"CevxZvSJLk8"}, ...]' value={jsonText} onChange={(e) => setJsonText(e.target.value)} />
          {jsonMsg && <p className="text-sm font-semibold">{jsonMsg}</p>}
          <button className="big-btn !py-2 w-full bg-pink-500 text-white" disabled={!jsonText.trim()}>Add these songs</button>
        </form>
      )}
      {mode === 'link' && (
        <form className="space-y-2" onSubmit={addLink}>
          <input className="field" placeholder="YouTube link" value={link} onChange={(e) => setLink(e.target.value)} />
          {parseYouTubeId(link) && (
            <img alt="" src={`https://i.ytimg.com/vi/${parseYouTubeId(link)}/mqdefault.jpg`} className="w-40 rounded-lg" />
          )}
          <input className="field" placeholder="Song title (filled in automatically if possible)" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} />
          <input className="field" placeholder="Artist (optional, helps find lyrics)" value={linkArtist} onChange={(e) => setLinkArtist(e.target.value)} />
          <select className="field" value={linkKind} onChange={(e) => setLinkKind(e.target.value)} aria-label="Video type">
            <option value="official">🎬 This is the original / official video</option>
            <option value="karaoke">🎤 This is a karaoke version</option>
          </select>
          <select className="field" value={linkGenre} onChange={(e) => setLinkGenre(e.target.value)} aria-label="Category">
            <option value="">Category (optional)</option>
            {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
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

    </section>
  )
}

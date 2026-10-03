import { useEffect, useMemo, useState } from 'react'
import { addSinger, clearSingers, getSingers, onSingersChange, removeSinger } from '../lib/singers.js'
import { GROUPS, genreGroup } from '../lib/genres.js'
import { hasBoth, isPlayable, resolveVersion, versionUsable, versionsOf } from '../lib/songs.js'
import { parseYouTubeId } from '../lib/youtube.js'
import { isBad } from '../lib/videoHealth.js'
import { HAS_SERVER } from '../lib/env.js'
import { findAlternatives, looksRight } from '../lib/alternatives.js'
import VersionToggle from './VersionToggle.jsx'

const VIEW_KEY = 'karaoke-picker-view'
const loadView = () => {
  try { return localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'list' } catch { return 'list' } // list is the default
}
const PREF_KEY = 'karaoke-version-pref'
const loadPref = () => {
  try { return localStorage.getItem(PREF_KEY) === 'official' ? 'official' : 'karaoke' } catch { return 'karaoke' }
}
const inCategory = (s, g) => (g === 'Karaoke' ? !!s.karaokeId || genreGroup(s.genre) === 'Karaoke' : genreGroup(s.genre) === g)

// Big, kid-friendly song grid. Tap a song -> say who's singing -> it joins the queue.
export default function SongPicker({ library, onPick, onQuickAdd, queuedIds = [], admin = false, canEdit = true, onRemove, onRename, onSetVersion, health = {}, checking = false, onRecheck, scan = {}, scanning = false, onRescan, hideExplicit = true, onHideExplicit, dbError = '' }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [view, setViewState] = useState(loadView) // 'grid' (thumbnails) or 'list' (title + artist only)
  const setView = (v) => {
    setViewState(v)
    try { localStorage.setItem(VIEW_KEY, v) } catch { /* ignore */ }
  }
  // which video to queue: a default for everything (karaoke unless you pick otherwise) plus per-song overrides
  const [pref, setPrefState] = useState(loadPref)
  const [overrides, setOverrides] = useState({})
  const setPref = (v) => {
    setPrefState(v)
    setOverrides({})
    try { localStorage.setItem(PREF_KEY, v) } catch { /* ignore */ }
  }
  const effective = (s) => resolveVersion(s, overrides[s.videoId] ?? pref, health)
  const [alt, setAlt] = useState(null) // { song, kind, loading, error, results } while looking for a replacement video
  const [fixMsg, setFixMsg] = useState('')
  const [chosen, setChosen] = useState(null)
  const [singer, setSinger] = useState('')
  const [singers, setSingers] = useState(getSingers)
  useEffect(() => onSingersChange(() => setSingers(getSingers())), [])

  // category chips: only the groups that actually have songs
  // songs whose videos are all known to be blocked or gone are hidden from kids (the manager still shows them, flagged)
  const visible = useMemo(
    () => (admin ? library : library.filter((s) => isPlayable(s, health) && !(hideExplicit && scan[s.videoId]?.s === 'strong'))),
    [library, health, admin, hideExplicit, scan],
  )
  const counts = useMemo(() => {
    const c = {}
    for (const g of [...GROUPS, 'Other']) c[g] = visible.filter((s) => inCategory(s, g)).length
    return c
  }, [visible])
  const categories = [...GROUPS, 'Other'].filter((g) => counts[g])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return visible.filter(
      (s) =>
        (category === 'All' || inCategory(s, category)) &&
        (!q || `${s.title} ${s.artist ?? ''}`.toLowerCase().includes(q)),
    )
  }, [visible, search, category])
  const filtering = search.trim() || category !== 'All'

  const remove = (song) => {
    if (window.confirm(`Remove "${song.title}" from the library?`)) onRemove?.(song)
  }
  const rename = (song) => {
    const title = window.prompt('Song title', song.title)
    if (title?.trim() && title.trim() !== song.title) onRename?.(song, title.trim())
  }

  const addVersion = (song, kind) => {
    const url = window.prompt(`Paste the YouTube link for the ${kind === 'karaoke' ? 'karaoke' : 'original'} version of "${song.title}"`)
    const id = parseYouTubeId(url || '')
    if (url && !id) return window.alert("That doesn't look like a YouTube link.")
    if (id) onSetVersion?.(song, kind, id)
  }
  const openAlt = async (song, kind) => {
    setAlt({ song, kind, loading: true, error: '', results: [] })
    try {
      setAlt({ song, kind, loading: false, error: '', results: await findAlternatives(song, kind) })
    } catch (e) {
      setAlt({ song, kind, loading: false, error: e.message, results: [] })
    }
  }
  const pickAlt = (id) => {
    onSetVersion?.(alt.song, alt.kind, id)
    setAlt(null)
  }
  // replace every blocked video with the first search result that looks like the right song
  const autoFix = async () => {
    let fixed = 0
    let failed = 0
    setFixMsg('Looking for replacements…')
    for (const s of library) {
      for (const [kind, id] of [['karaoke', versionsOf(s).karaoke], ['official', versionsOf(s).official]]) {
        if (!id || !isBad(health[id])) continue
        try {
          const found = (await findAlternatives(s, kind)).find((r) => r.good && r.videoId !== id)
          if (found) { onSetVersion?.(s, kind, found.videoId); fixed++ } else failed++
        } catch { failed++ }
      }
    }
    setFixMsg(`Replaced ${fixed}${failed ? `, couldn't find a good match for ${failed} (use 🔄 Find another on those)` : ''}.`)
  }
  const explicitBadge = (s) => {
    const r = scan[s.videoId]
    if (!r || (r.s !== 'strong' && r.s !== 'mild')) return null
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.s === 'strong' ? 'bg-rose-200 text-rose-900' : 'bg-amber-100 text-amber-900'}`}
        title={`Words found in the lyrics: ${r.words.join(', ')}`}
      >
        🔞 {r.s === 'strong' ? 'explicit' : 'mild'}: {r.words.slice(0, 3).join(', ')}
      </span>
    )
  }

  const problems = (s) => {
    const v = versionsOf(s)
    return [['karaoke', v.karaoke], ['official', v.official]].filter(([, id]) => id && isBad(health[id]))
  }

  // the small control on each song: switch version if there are two, otherwise say which one exists
  const versionControl = (s) => {
    const eff = effective(s)
    if (hasBoth(s)) {
      return <VersionToggle size="sm" value={eff.version} usable={versionUsable(s, health)} onChange={(v) => setOverrides((o) => ({ ...o, [s.videoId]: v }))} />
    }
    return <span className="text-xs font-semibold text-slate-500">{eff.version === 'karaoke' ? '🎤 Karaoke only' : '🎬 Original only'}</span>
  }
  const managerButtons = (s) => (
    <span className="flex flex-wrap items-center gap-2 justify-end">
      {explicitBadge(s)}
      {problems(s).map(([kind, id]) => (
        <span key={kind} className="inline-flex items-center gap-1">
          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-900" title={`This video ${health[id] === 'missing' ? 'was removed or is private' : 'does not allow embedding'}`}>
            ⚠️ {kind === 'karaoke' ? 'karaoke' : 'original'} {health[id] === 'missing' ? 'gone' : 'blocked'}
          </span>
          {HAS_SERVER && (
            <span role="button" className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-900 cursor-pointer hover:bg-sky-200" onClick={(e) => { e.stopPropagation(); openAlt(s, kind) }}>
              🔄 Find another
            </span>
          )}
        </span>
      ))}
      {!versionsOf(s).karaoke && <span role="button" className="rounded-full bg-violet-100 px-2 py-1 text-xs font-bold cursor-pointer hover:bg-violet-200" onClick={(e) => { e.stopPropagation(); addVersion(s, 'karaoke') }}>＋🎤 karaoke</span>}
      {!versionsOf(s).official && <span role="button" className="rounded-full bg-violet-100 px-2 py-1 text-xs font-bold cursor-pointer hover:bg-violet-200" onClick={(e) => { e.stopPropagation(); addVersion(s, 'official') }}>＋🎬 original</span>}
      <span role="button" aria-label={`Rename ${s.title}`} className="w-10 h-10 grid place-items-center rounded-full bg-violet-200 text-xl cursor-pointer hover:bg-violet-300" onClick={(e) => { e.stopPropagation(); rename(s) }}>✏️</span>
      <span role="button" aria-label={`Remove ${s.title}`} className="w-10 h-10 grid place-items-center rounded-full bg-rose-600 text-white text-xl cursor-pointer hover:bg-rose-700" onClick={(e) => { e.stopPropagation(); remove(s) }}>🗑️</span>
    </span>
  )

  const confirm = (name) => {
    const who = (name ?? singer).trim() // may be empty: they can be named later from the queue
    if (who) addSinger(who)
    onPick(chosen, who, effective(chosen).version)
    setChosen(null)
    setSinger('')
  }

  return (
    <div>
      {admin && (
        <div className="rounded-2xl bg-rose-100 text-rose-900 p-3 mb-4">
          <p className="font-bold">🛠️ Managing the song library: {canEdit ? '✏️ renames a song, 🗑️ removes it. Tap Done when you\'re finished.' : 'sign in above to rename or remove songs.'}</p>
          {dbError && <p className="text-sm mt-1">{dbError}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold">
              {checking
                ? 'Checking that every video can play…'
                : library.filter((s) => problems(s).length).length
                  ? `⚠️ ${library.filter((s) => problems(s).length).length} song(s) have a video that can't be played here (flagged below). The app already avoids them.`
                  : '✅ Every video can be played here'}
            </span>
            <button className="big-btn !py-1 !px-3 !text-sm bg-white text-rose-800" onClick={onRecheck} disabled={checking}>🔍 Re-check now</button>
            {HAS_SERVER && library.some((s) => problems(s).length) && (
              <button className="big-btn !py-1 !px-3 !text-sm bg-sky-200 text-sky-900" onClick={autoFix}>🔄 Replace all blocked videos</button>
            )}
            {fixMsg && <span className="text-sm font-semibold">{fixMsg}</span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold">
              {scanning
                ? 'Scanning lyrics for explicit words…'
                : `🔞 ${library.filter((s) => scan[s.videoId]?.s === 'strong').length} song(s) with strong language, ${library.filter((s) => scan[s.videoId]?.s === 'mild').length} with mild words (shown as [bloop] on screen).`}
            </span>
            <button className="big-btn !py-1 !px-3 !text-sm bg-white text-rose-800" onClick={onRescan} disabled={scanning}>🧼 Re-scan lyrics</button>
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" className="h-5 w-5" checked={hideExplicit} onChange={(e) => onHideExplicit?.(e.target.checked)} />
              Hide songs with strong language from kids
            </label>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          className="field !text-xl !py-3 flex-1 min-w-[12rem]"
          placeholder="🔍 Search by song or artist…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="big-btn !py-2 bg-white/80" onClick={() => setSearch('')} aria-label="Clear search">✖</button>
        )}
        {!admin && (
          <span className="flex items-center gap-2 rounded-xl bg-white/20 px-3 py-2 text-white font-semibold">
            Play: <VersionToggle value={pref} onChange={setPref} />
          </span>
        )}
        <div className="flex rounded-xl overflow-hidden shadow-md" role="group" aria-label="View">
          {[['grid', '🖼️ Pictures'], ['list', '☰ List']].map(([v, label]) => (
            <button
              key={v}
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`px-4 py-3 font-bold ${view === v ? 'bg-yellow-300 text-violet-800' : 'bg-white/30 text-white hover:bg-white/40'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3" role="tablist" aria-label="Filter by category">
          {['All', ...categories].map((g) => (
            <button
              key={g}
              role="tab"
              aria-selected={category === g}
              onClick={() => setCategory(g)}
              className={`shrink-0 rounded-full px-4 py-2 font-bold text-base transition ${category === g ? 'bg-yellow-300 text-violet-800' : 'bg-white/30 text-white hover:bg-white/40'}`}
            >
              {g}{g !== 'All' ? ` (${counts[g]})` : ` (${library.length})`}
            </button>
          ))}
        </div>
      )}
      {library.length === 0 && (
        <p className="text-lg text-slate-600 text-center py-10">
          No songs yet! Ask the host to add some. 🎶
        </p>
      )}
      {library.length > 0 && shown.length === 0 && (
        <div className="text-center text-white py-10">
          <p className="text-2xl font-bold mb-3">No songs match{search ? ` “${search}”` : ''} 🤔</p>
          <button className="big-btn bg-white text-violet-700" onClick={() => { setSearch(''); setCategory('All') }}>Show all songs</button>
        </div>
      )}
      {view === 'list' ? (
        <ul className="grid gap-2 lg:grid-cols-2">
          {shown.map((s) => (
            <li key={s.videoId}>
              <button
                onClick={() => (admin ? undefined : setChosen(s))}
                className="w-full flex items-center gap-3 text-left rounded-2xl bg-white shadow px-4 py-3 active:scale-[0.98] hover:bg-violet-50 transition"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-lg sm:text-xl leading-tight truncate">{s.title}</span>
                  {s.artist && <span className="block text-sm sm:text-base text-slate-500 truncate">{s.artist}</span>}
                </span>
                {!admin && versionControl(s)}
                {!admin && queuedIds.includes(s.videoId) && (
                  <span className="shrink-0 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">In line ✓</span>
                )}
                {!admin && onQuickAdd && (
                  <span
                    role="button"
                    aria-label={`Add ${s.title} to the queue`}
                    className="shrink-0 rounded-xl bg-pink-500 px-4 py-2 font-bold text-white shadow hover:bg-pink-600 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); onQuickAdd(s, effective(s).version) }}
                  >
                    ＋ Add
                  </span>
                )}
                {admin && canEdit && managerButtons(s)}
              </button>
            </li>
          ))}
        </ul>
      ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {shown.map((s) => (
          <button
            key={s.videoId}
            onClick={() => (admin ? undefined : setChosen(s))}
            className="group text-left rounded-2xl bg-white shadow-md overflow-hidden active:scale-95 hover:-translate-y-1 hover:shadow-xl transition"
          >
            <div className="relative aspect-video bg-violet-200">
              <img loading="lazy" alt="" src={`https://i.ytimg.com/vi/${effective(s).videoId}/mqdefault.jpg`} className="w-full h-full object-cover" />
              {admin && canEdit && <span className="absolute inset-x-2 top-2 flex justify-end">{managerButtons(s)}</span>}
              {!admin && queuedIds.includes(s.videoId) && (
                <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">In line ✓</span>
              )}
            </div>
            <div className="p-3">
              <p className="font-bold text-base sm:text-lg leading-tight line-clamp-2 group-hover:text-pink-600">{s.title}</p>
              {s.artist && <p className="text-sm text-slate-500 truncate">{s.artist}</p>}
              {!admin && <div className="mt-1">{versionControl(s)}</div>}
              {!admin && onQuickAdd && (
                <span
                  role="button"
                  aria-label={`Add ${s.title} to the queue`}
                  className="mt-2 inline-block rounded-xl bg-pink-500 px-3 py-1 text-sm font-bold text-white hover:bg-pink-600 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onQuickAdd(s, effective(s).version) }}
                >
                  ＋ Add to queue
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      )}

      {alt && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setAlt(null)}>
          <div className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-sky-800">🔄 Another {alt.kind === 'karaoke' ? 'karaoke' : 'original'} video for “{alt.song.title}”</h3>
            {alt.loading && <p>Searching…</p>}
            {alt.error && <p className="text-rose-700 font-semibold">{alt.error}</p>}
            <ul className="space-y-2">
              {alt.results.map((r) => (
                <li key={r.videoId}>
                  <button className="flex w-full items-center gap-3 rounded-xl bg-slate-100 p-2 text-left hover:bg-sky-100" onClick={() => pickAlt(r.videoId)}>
                    <img alt="" src={`https://i.ytimg.com/vi/${r.videoId}/default.jpg`} className="h-12 w-16 rounded object-cover" />
                    <span className="min-w-0 flex-1 text-sm">{r.title}</span>
                    {r.good && <span className="shrink-0 rounded-full bg-green-200 px-2 py-0.5 text-xs font-bold text-green-900">looks right</span>}
                  </button>
                </li>
              ))}
            </ul>
            {!alt.loading && !alt.error && alt.results.length === 0 && <p>No embeddable results found.</p>}
            <button className="underline text-sm" onClick={() => setAlt(null)}>Cancel</button>
          </div>
        </div>
      )}

      {chosen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setChosen(null)}>
          <div className="card w-full max-w-md space-y-3 animate-pop" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-pink-600">🎤 {chosen.title}{chosen.artist && <span className="block text-base font-normal text-slate-500">{chosen.artist}</span>}</h3>
            <p className="text-sm text-slate-500">{effective(chosen).version === 'karaoke' ? '🎤 Karaoke version' : '🎬 Original video'}</p>
            <p className="text-lg">Who's singing? <span className="text-sm text-slate-500">(optional, you can add it later)</span></p>
            {singers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {singers.map((n) => (
                  <span key={n} className="inline-flex rounded-2xl bg-violet-200 shadow-md overflow-hidden">
                    <button className="px-4 py-2 font-bold text-lg hover:bg-violet-300" onClick={() => confirm(n)}>{n}</button>
                    <button className="px-2 text-violet-700 hover:bg-rose-200" aria-label={`Remove ${n}`} title="Remove this name" onClick={() => removeSinger(n)}>✕</button>
                  </span>
                ))}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); confirm() }} className="flex gap-2">
              <input autoFocus className="field !text-xl" placeholder="Type a name" value={singer} onChange={(e) => setSinger(e.target.value)} />
              <button className="big-btn bg-pink-500 text-white">{singer.trim() ? 'Sing it!' : 'Add it!'}</button>
            </form>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <button className="underline" onClick={() => setChosen(null)}>Cancel</button>
              {singers.length > 1 && <button className="underline ml-auto" onClick={clearSingers}>Clear all names</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

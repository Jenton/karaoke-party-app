import { useEffect, useMemo, useState } from 'react'
import { addSinger, clearSingers, getSingers, onSingersChange, removeSinger } from '../lib/singers.js'
import { SignIn } from './LibraryAdmin.jsx'
import { GROUPS, genreGroup } from '../lib/genres.js'

const VIEW_KEY = 'karaoke-picker-view'
const loadView = () => {
  try { return localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'list' } catch { return 'list' } // list is the default
}
// Big, kid-friendly song grid. Tap a song -> say who's singing -> it joins the queue.
export default function SongPicker({ library, onPick, onQuickAdd, queuedIds = [], admin = false, onRemove, adminNeedsSignIn = null, dbError = '' }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [view, setViewState] = useState(loadView) // 'grid' (thumbnails) or 'list' (title + artist only)
  const setView = (v) => {
    setViewState(v)
    try { localStorage.setItem(VIEW_KEY, v) } catch { /* ignore */ }
  }
  const [chosen, setChosen] = useState(null)
  const [singer, setSinger] = useState('')
  const [singers, setSingers] = useState(getSingers)
  useEffect(() => onSingersChange(() => setSingers(getSingers())), [])

  // category chips: only the groups that actually have songs
  const counts = useMemo(() => {
    const c = {}
    for (const s of library) c[genreGroup(s.genre)] = (c[genreGroup(s.genre)] ?? 0) + 1
    return c
  }, [library])
  const categories = [...GROUPS, 'Other'].filter((g) => counts[g])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return library.filter(
      (s) =>
        (category === 'All' || genreGroup(s.genre) === category) &&
        (!q || `${s.title} ${s.artist ?? ''}`.toLowerCase().includes(q)),
    )
  }, [library, search, category])
  const filtering = search.trim() || category !== 'All'

  const confirm = (name) => {
    const who = (name ?? singer).trim() // may be empty: they can be named later from the queue
    if (who) addSinger(who)
    onPick(chosen, who)
    setChosen(null)
    setSinger('')
  }

  return (
    <div>
      {admin && (
        <div className="rounded-2xl bg-rose-100 text-rose-900 p-3 mb-4 space-y-2">
          <p className="font-bold">🛠️ Admin mode: tap 🗑️ on a song to remove it from the library. Turn admin off to pick songs again.</p>
          {dbError && <p className="text-sm">{dbError}</p>}
          {adminNeedsSignIn && (
            <div className="max-w-sm"><SignIn auth={adminNeedsSignIn} /></div>
          )}
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
                {!admin && queuedIds.includes(s.videoId) && (
                  <span className="shrink-0 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">In line ✓</span>
                )}
                {!admin && onQuickAdd && (
                  <span
                    role="button"
                    aria-label={`Add ${s.title} to the queue`}
                    className="shrink-0 rounded-xl bg-pink-500 px-4 py-2 font-bold text-white shadow hover:bg-pink-600 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); onQuickAdd(s) }}
                  >
                    ＋ Add
                  </span>
                )}
                {admin && (
                  <span
                    role="button"
                    aria-label={`Remove ${s.title}`}
                    className="shrink-0 w-10 h-10 grid place-items-center rounded-full bg-rose-600 text-white text-xl cursor-pointer hover:bg-rose-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm(`Remove "${s.title}" from the library?`)) onRemove?.(s)
                    }}
                  >
                    🗑️
                  </span>
                )}
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
              <img loading="lazy" alt="" src={`https://i.ytimg.com/vi/${s.videoId}/mqdefault.jpg`} className="w-full h-full object-cover" />
              {admin && (
                <span
                  role="button"
                  aria-label={`Remove ${s.title}`}
                  className="absolute top-2 right-2 w-10 h-10 grid place-items-center rounded-full bg-rose-600 text-white text-xl shadow cursor-pointer hover:bg-rose-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm(`Remove "${s.title}" from the library?`)) onRemove?.(s)
                  }}
                >
                  🗑️
                </span>
              )}
              {!admin && queuedIds.includes(s.videoId) && (
                <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">In line ✓</span>
              )}
            </div>
            <div className="p-3">
              <p className="font-bold text-base sm:text-lg leading-tight line-clamp-2 group-hover:text-pink-600">{s.title}</p>
              {s.artist && <p className="text-sm text-slate-500 truncate">{s.artist}</p>}
              {!admin && onQuickAdd && (
                <span
                  role="button"
                  aria-label={`Add ${s.title} to the queue`}
                  className="mt-2 inline-block rounded-xl bg-pink-500 px-3 py-1 text-sm font-bold text-white hover:bg-pink-600 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onQuickAdd(s) }}
                >
                  ＋ Add to queue
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      )}

      {chosen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setChosen(null)}>
          <div className="card w-full max-w-md space-y-3 animate-pop" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-pink-600">🎤 {chosen.title}{chosen.artist && <span className="block text-base font-normal text-slate-500">{chosen.artist}</span>}</h3>
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

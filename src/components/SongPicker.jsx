import { useMemo, useState } from 'react'
import { SignIn } from './LibraryAdmin.jsx'

const SINGERS_KEY = 'karaoke-singers'
const loadSingers = () => {
  try { return JSON.parse(localStorage.getItem(SINGERS_KEY)) || [] } catch { return [] }
}

// Big, kid-friendly song grid. Tap a song -> say who's singing -> it joins the queue.
export default function SongPicker({ library, onPick, queuedIds = [], admin = false, onRemove, adminNeedsSignIn = null, dbError = '' }) {
  const [search, setSearch] = useState('')
  const [chosen, setChosen] = useState(null)
  const [singer, setSinger] = useState('')
  const [singers, setSingers] = useState(loadSingers)

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? library.filter((s) => `${s.title} ${s.artist ?? ''}`.toLowerCase().includes(q)) : library
  }, [library, search])

  const confirm = (name) => {
    const who = (name ?? singer).trim() || 'Mystery Singer'
    const next = [who, ...singers.filter((n) => n !== who)].slice(0, 12)
    setSingers(next)
    try { localStorage.setItem(SINGERS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
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
      <input
        className="field !text-xl !py-3 mb-4"
        placeholder="🔍 Search songs…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {library.length === 0 && (
        <p className="text-lg text-slate-600 text-center py-10">
          No songs yet! Tap <b>➕ Add a song</b> to start the song list.
        </p>
      )}
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
            </div>
          </button>
        ))}
      </div>

      {chosen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setChosen(null)}>
          <div className="card w-full max-w-md space-y-3 animate-pop" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-pink-600">🎤 {chosen.title}{chosen.artist && <span className="block text-base font-normal text-slate-500">{chosen.artist}</span>}</h3>
            <p className="text-lg">Who's singing?</p>
            {singers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {singers.map((n) => (
                  <button key={n} className="big-btn !py-2 bg-violet-200" onClick={() => confirm(n)}>{n}</button>
                ))}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); confirm() }} className="flex gap-2">
              <input autoFocus className="field !text-xl" placeholder="Type a name" value={singer} onChange={(e) => setSinger(e.target.value)} />
              <button className="big-btn bg-pink-500 text-white">Sing it!</button>
            </form>
            <button className="text-slate-500 underline" onClick={() => setChosen(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useSharedState } from './hooks/useSharedState.js'
import YouTubePlayer from './components/YouTubePlayer.jsx'
import AddSongForm from './components/AddSongForm.jsx'
import Queue from './components/Queue.jsx'
import Lyrics from './components/Lyrics.jsx'
import PitchControls from './components/PitchControls.jsx'
import SongPicker from './components/SongPicker.jsx'
import LibraryAdmin from './components/LibraryAdmin.jsx'
import { HAS_SERVER } from './lib/env.js'
import { useLibrary } from './hooks/useLibrary.js'
import { useAuth } from './hooks/useAuth.js'
import RemoteView from './components/RemoteView.jsx'

const isRemote = new URLSearchParams(location.search).has('remote')

export default function App() {
  const [state, update] = useSharedState()
  const [started, setStarted] = useState(false)
  const [admin, setAdmin] = useState(false)
  const [picking, setPicking] = useState(false)
  const { library, save: saveLibrary, reload, error: libraryError, seed, usingDb } = useLibrary()
  const auth = useAuth()
  const canEdit = !usingDb || !!auth.session
  const [autoNext, setAutoNext] = useState(true)
  const [semitones, setSemitones] = useState(0)
  const [addresses, setAddresses] = useState([])
  const player = useRef(null)
  const { queue, current } = state

  const actions = {
    add: (song) =>
      update((s) => (s.current ? { ...s, queue: [...s.queue, song] } : { ...s, current: song })),
    addFromLibrary: (song, singer) => {
      actions.add({ id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()), videoId: song.videoId, title: song.title, singer, lyrics: '' })
      setPicking(false)
    },
    remove: (id) => update((s) => ({ ...s, queue: s.queue.filter((q) => q.id !== id) })),
    moveUp: (id) =>
      update((s) => {
        const i = s.queue.findIndex((q) => q.id === id)
        if (i < 1) return s
        const q = [...s.queue]
        ;[q[i - 1], q[i]] = [q[i], q[i - 1]]
        return { ...s, queue: q }
      }),
    playNow: (id) =>
      update((s) => {
        const song = s.queue.find((q) => q.id === id)
        return song ? { current: song, queue: s.queue.filter((q) => q.id !== id) } : s
      }),
    next: () =>
      update((s) => ({ current: s.queue[0] ?? null, queue: s.queue.slice(1) })),
    patchCurrent: (patch) =>
      update((s) => (s.current ? { ...s, current: { ...s.current, ...patch } } : s)),
  }

  // each new song starts in its original key
  useEffect(() => setSemitones(0), [current?.id])

  useEffect(() => {
    if (!HAS_SERVER) return
    fetch('/api/info').then((r) => r.json()).then((d) => setAddresses(d.addresses)).catch(() => {})
  }, [])

  const onEnded = () => {
    if (autoNext) setTimeout(actions.next, 3000)
  }

  if (isRemote) return <RemoteView state={state} actions={actions} library={library} />

  const phoneUrl = addresses[0] ? `http://${addresses[0]}:${location.port}/?remote` : null

  return (
    <div className="max-w-[1600px] mx-auto p-3 sm:p-6">
      <header className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-3xl sm:text-5xl font-bold text-white drop-shadow mr-auto animate-wiggle">🎤 Karaoke Party! 🎉</h1>
        <label className="flex items-center gap-2 text-white font-semibold">
          <input type="checkbox" className="w-5 h-5" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} />
          Auto-play next
        </label>
        <button className="big-btn !text-2xl !px-8 bg-yellow-300 text-violet-800 animate-float" onClick={() => { reload(); setPicking(true) }}>
          🎵 Pick a song!
        </button>
        <button className="big-btn bg-white text-violet-700" onClick={() => { reload(); setAdmin((a) => !a) }}>
          🔧 Grown-ups
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <main className="space-y-4 min-w-0">
          <div className="relative aspect-video rounded-3xl overflow-hidden bg-black shadow-2xl">
            <YouTubePlayer ref={player} videoId={current?.videoId} autoplay={started} onEnded={onEnded} />
            {!started && (
              <button
                onClick={() => setStarted(true)}
                className="absolute inset-0 grid place-items-center bg-violet-900/90 text-white text-3xl sm:text-5xl font-bold hover:bg-violet-800 transition"
              >
                🎉 Tap to start the party!
              </button>
            )}
            {started && !current && (
              <div className="absolute inset-0 grid place-items-center bg-violet-900/90 text-white text-center p-6 pointer-events-none">
                <p className="text-3xl sm:text-5xl font-bold animate-float">Add a song to get started 🎶</p>
              </div>
            )}
          </div>

          <div className="card flex flex-wrap items-center gap-3">
            <div className="min-w-0 mr-auto">
              <p className="text-sm font-semibold text-pink-600">NOW SINGING</p>
              <p className="text-2xl sm:text-4xl font-bold truncate">{current ? current.title : '—'}</p>
              <p className="text-lg sm:text-2xl">{current ? `🎤 ${current.singer}` : 'Waiting for a singer…'}</p>
            </div>
            <button className="big-btn bg-sky-400 text-white" disabled={!current} onClick={() => player.current?.restart()}>🔁 Restart</button>
            <button className="big-btn bg-green-500 text-white" disabled={!current && !queue.length} onClick={actions.next}>⏭️ Next song</button>
          </div>

          <Lyrics song={current} getTime={() => player.current?.getTime() ?? 0} onChange={actions.patchCurrent} />
        </main>

        <aside className="space-y-4">
          <Queue queue={queue} onPlay={actions.playNow} onRemove={actions.remove} onMoveUp={actions.moveUp} />
          <PitchControls semitones={semitones} onChange={setSemitones} />
          {admin && <LibraryAdmin library={library} save={saveLibrary} auth={auth} usingDb={usingDb} canEdit={canEdit} dbError={libraryError} seed={seed} />}
          {admin && <AddSongForm onAdd={actions.add} onSaveToLibrary={!canEdit ? undefined : (s) => saveLibrary([...library.filter((x) => x.videoId !== s.videoId), s])} />}
          {admin && phoneUrl && (
            <div className="card text-center">
              <p className="font-bold text-violet-700">📱 Add songs from a phone</p>
              <p className="text-sm text-slate-600">Same Wi-Fi, then open:</p>
              <p className="font-mono font-bold break-all">{phoneUrl}</p>
            </div>
          )}
        </aside>
      </div>

      {picking && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-gradient-to-br from-violet-600 via-pink-600 to-orange-500 p-4 sm:p-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-3xl sm:text-5xl font-bold text-white drop-shadow mr-auto">🎵 Pick a song!</h2>
              <button className="big-btn !text-2xl bg-white text-violet-700" onClick={() => setPicking(false)}>✖ Close</button>
            </div>
            <SongPicker
              library={library}
              queuedIds={[current, ...queue].filter(Boolean).map((s) => s.videoId)}
              onPick={actions.addFromLibrary}
            />
          </div>
        </div>
      )}
    </div>
  )
}

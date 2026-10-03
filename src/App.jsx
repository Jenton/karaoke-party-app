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
  const [panel, setPanel] = useState(null) // 'queue' | 'key' | 'admin' | null
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

  const openPicker = () => { reload(); setPicking(true) }
  const togglePanel = (name) => { if (name === 'admin') reload(); setPanel((p) => (p === name ? null : name)) }
  const toggleFullscreen = () =>
    document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()

  const tool = (name, label, extra = '') => (
    <button
      className={`rounded-xl px-3 py-2 text-sm sm:text-base font-semibold transition ${panel === name ? 'bg-white text-violet-700' : 'bg-white/20 text-white hover:bg-white/30'}`}
      onClick={() => togglePanel(name)}
    >
      {label}{extra}
    </button>
  )

  return (
    <div className="flex flex-col p-3 sm:p-4 gap-3 lg:h-screen lg:overflow-hidden">
      {/* slim toolbar: everything except the stage is a secondary control */}
      <header className="flex flex-wrap items-center gap-2 shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow mr-auto">🎤 Karaoke Party</h1>
        <button className="rounded-xl px-4 py-2 font-bold bg-yellow-300 text-violet-800 hover:brightness-110 active:scale-95 transition" onClick={openPicker}>
          🎵 Pick a song
        </button>
        {tool('queue', '🎟️ Queue', queue.length ? ` (${queue.length})` : '')}
        {tool('key', semitones ? `🎚️ Key ${semitones > 0 ? '+' : ''}${semitones}` : '🎚️ Key')}
        {tool('admin', '🔧 Grown-ups')}
        <button className="rounded-xl px-3 py-2 bg-white/20 text-white hover:bg-white/30" onClick={toggleFullscreen} aria-label="Full screen" title="Full screen">⛶</button>
      </header>

      {/* the stage: video + lyrics take the whole screen */}
      <main className="grid gap-3 lg:gap-4 lg:flex-1 lg:min-h-0 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="flex flex-col gap-3 min-w-0 lg:min-h-0">
          <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-black shadow-2xl">
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
              <div className="absolute inset-0 grid place-items-center bg-violet-900/90 text-white text-center p-6">
                <div>
                  <p className="text-3xl sm:text-5xl font-bold mb-6">Who's up next? 🎶</p>
                  <button className="big-btn !text-2xl !px-8 bg-yellow-300 text-violet-800" onClick={openPicker}>🎵 Pick a song!</button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white/90 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="min-w-0 mr-auto">
              <p className="text-xl sm:text-3xl lg:text-5xl font-bold truncate">{current ? current.title : 'Waiting for a singer…'}</p>
              {current && <p className="text-base sm:text-xl lg:text-3xl text-pink-600 font-semibold">🎤 {current.singer}</p>}
            </div>
            <div className="flex gap-2">
              <button className="rounded-lg px-3 py-1.5 bg-sky-100 text-sky-800 font-semibold disabled:opacity-40" disabled={!current} onClick={() => player.current?.restart()}>🔁 Restart</button>
              <button className="rounded-lg px-3 py-1.5 bg-green-100 text-green-800 font-semibold disabled:opacity-40" disabled={!current && !queue.length} onClick={actions.next}>⏭️ Next</button>
            </div>
          </div>

          {queue.length > 0 && (
            <div className="rounded-2xl bg-white/20 text-white px-4 py-3 min-h-0 overflow-hidden">
              <p className="text-sm font-semibold uppercase tracking-wide opacity-80 mb-1">Up next</p>
              <ol className="space-y-1 text-lg sm:text-xl lg:text-2xl">
                {queue.slice(0, 4).map((q, i) => (
                  <li key={q.id} className="truncate"><span className="opacity-70">{i + 1}.</span> <b>{q.singer}</b> · {q.title}</li>
                ))}
                {queue.length > 4 && <li className="opacity-70 text-base">+ {queue.length - 4} more</li>}
              </ol>
            </div>
          )}
        </section>

        <div className="min-h-[55vh] lg:min-h-0 min-w-0">
          <Lyrics song={current} getTime={() => player.current?.getTime() ?? 0} onChange={actions.patchCurrent} />
        </div>
      </main>

      {/* secondary tools slide in from the side and can be closed */}
      {/* always mounted (just hidden) so the key changer keeps running while the panel is closed */}
      {(
        <aside className={`${panel ? '' : 'hidden'} fixed inset-y-0 right-0 z-30 w-full sm:w-[440px] overflow-y-auto bg-violet-50 shadow-2xl p-4 space-y-4`}>
          <div className="flex items-center">
            <h2 className="text-xl font-bold text-violet-800 mr-auto">
              {{ queue: '🎟️ Queue', key: '🎚️ Key changer', admin: '🔧 Grown-ups' }[panel] ?? ''}
            </h2>
            <button className="rounded-lg px-3 py-1 bg-white font-bold" onClick={() => setPanel(null)}>✖ Close</button>
          </div>
          {panel === 'queue' && (
            <>
              <Queue queue={queue} onPlay={actions.playNow} onRemove={actions.remove} onMoveUp={actions.moveUp} />
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" className="w-5 h-5" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} />
                Auto-play next song
              </label>
            </>
          )}
          <div className={panel === 'key' ? '' : 'hidden'}>
            <PitchControls semitones={semitones} onChange={setSemitones} />
          </div>
          {panel === 'admin' && (
            <>
              <LibraryAdmin library={library} save={saveLibrary} auth={auth} usingDb={usingDb} canEdit={canEdit} dbError={libraryError} seed={seed} />
              <AddSongForm onAdd={actions.add} onSaveToLibrary={!canEdit ? undefined : (s) => saveLibrary([...library.filter((x) => x.videoId !== s.videoId), s])} />
              {phoneUrl && (
                <div className="card text-center">
                  <p className="font-bold text-violet-700">📱 Add songs from a phone</p>
                  <p className="text-sm text-slate-600">Same Wi-Fi, then open:</p>
                  <p className="font-mono font-bold break-all">{phoneUrl}</p>
                </div>
              )}
            </>
          )}
        </aside>
      )}

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

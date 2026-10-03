import { useEffect, useRef, useState } from 'react'
import { useSharedState } from './hooks/useSharedState.js'
import YouTubePlayer from './components/YouTubePlayer.jsx'
import AddSongForm from './components/AddSongForm.jsx'
import Queue from './components/Queue.jsx'
import LyricsOverlay from './components/LyricsOverlay.jsx'
import LyricsPanel from './components/LyricsPanel.jsx'
import Visualizer from './components/Visualizer.jsx'
import { useLyrics } from './hooks/useLyrics.js'
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
  const [panel, setPanel] = useState(null) // 'queue' | 'key' | 'add' | 'lyrics' | null
  const [picking, setPicking] = useState(false)
  const [adminMode, setAdminMode] = useState(false) // host-only: lets you remove songs from the picker
  const [menu, setMenu] = useState(false) // host menu
  const [toast, setToast] = useState(null)
  const [readyId, setReadyId] = useState(null) // song whose get-ready countdown has finished
  const [count, setCount] = useState(0)
  const { library, save: saveLibrary, reload, loaded, error: libraryError, missingStarters, addStarters, usingDb } = useLibrary()
  const auth = useAuth()
  const canEdit = !usingDb || !!auth.session

  // One time per device: the first time you're signed in, put the starter songs in the database for you.
  useEffect(() => {
    if (!usingDb || !canEdit || !loaded || libraryError || !missingStarters.length) return
    if (localStorage.getItem('karaoke-starters-added')) return
    addStarters().then((ok) => ok && localStorage.setItem('karaoke-starters-added', '1'))
  }, [usingDb, canEdit, loaded, libraryError, missingStarters.length, addStarters])
  const [autoNext, setAutoNext] = useState(true)
  const [semitones, setSemitones] = useState(0)
  const [addresses, setAddresses] = useState([])
  const player = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [playerError, setPlayerError] = useState(false)
  // the visualizer is the default; the video keeps playing (and supplying the sound) underneath it
  const [stageMode, setStageMode] = useState(() => {
    try { return localStorage.getItem('karaoke-stage-mode') === 'video' ? 'video' : 'visualizer' } catch { return 'visualizer' }
  })
  const setMode = (m) => {
    setStageMode(m)
    try { localStorage.setItem('karaoke-stage-mode', m) } catch { /* ignore */ }
  }
  const { queue, current } = state

  const actions = {
    add: (song) =>
      update((s) => (s.current ? { ...s, queue: [...s.queue, song] } : { ...s, current: song })),
    addFromLibrary: (song, singer) => {
      const position = queue.length + 1 // 1 = next in line
      actions.add({ id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()), videoId: song.videoId, title: song.title, artist: song.artist, singer, lyrics: '' })
      setPicking(false)
      setToast({
        id: Date.now(),
        text: !current
          ? `🎤 ${singer}, you're on stage!`
          : position === 1
            ? `✅ ${singer} is up next with “${song.title}”`
            : `✅ ${singer} is #${position} in line`,
      })
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

  const lyrics = useLyrics(isRemote ? null : current, actions.patchCurrent)

  // toast disappears on its own
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(id)
  }, [toast])

  // get-ready countdown before each song so the singer can grab the mic
  const holding = !isRemote && !!current && started && readyId !== current.id
  useEffect(() => {
    if (isRemote || !current || !started) return
    let n = 3
    setCount(n)
    const id = setInterval(() => {
      n -= 1
      setCount(n)
      if (n <= 0) { clearInterval(id); setReadyId(current.id) }
    }, 1000)
    return () => clearInterval(id)
  }, [current?.id, started])

  // each new song starts in its original key
  useEffect(() => { setSemitones(0); setPlayerError(false) }, [current?.id])

  // the video can't be seen in visualizer mode, so say so (and move on) when YouTube refuses to play it
  const onPlayerError = () => {
    setPlayerError(true)
    setTimeout(() => { setPlayerError(false); actions.next() }, 3500)
  }

  useEffect(() => {
    if (!HAS_SERVER) return
    fetch('/api/info').then((r) => r.json()).then((d) => setAddresses(d.addresses)).catch(() => {})
  }, [])

  const onEnded = () => {
    if (autoNext) setTimeout(actions.next, 1000)
  }

  if (isRemote) return <RemoteView state={state} actions={actions} library={library} />

  const phoneUrl = addresses[0] ? `http://${addresses[0]}:${location.port}/?remote` : null

  const openPicker = () => { reload(); setPicking(true) }
  const togglePanel = (name) => { if (name === 'add') reload(); setPanel((p) => (p === name ? null : name)) }
  const toggleFullscreen = () =>
    document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()

  const menuItem = (label, onClick) => (
    <button
      className="w-full text-left rounded-lg px-3 py-2 text-base font-semibold text-violet-900 hover:bg-violet-100"
      onClick={() => { setMenu(false); onClick() }}
    >
      {label}
    </button>
  )

  const stageWidth = 'w-full lg:w-[min(100%,calc((100vh-12rem)*1.7778))]'

  return (
    <div className="flex flex-col p-3 sm:p-4 gap-3 lg:h-screen lg:overflow-hidden">
      {/* slim toolbar: everything except the stage is a secondary control */}
      <header className="relative flex items-center gap-2 shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow mr-auto">🎤 Karaoke Party</h1>
        <button className="rounded-xl px-5 py-2 text-lg font-bold bg-yellow-300 text-violet-800 hover:brightness-110 active:scale-95 transition" onClick={openPicker}>
          🎵 Pick a song
        </button>
        <button
          className={`rounded-xl px-3 py-2 font-semibold transition ${menu ? 'bg-white text-violet-700' : 'bg-white/20 text-white hover:bg-white/30'}`}
          onClick={() => setMenu((m) => !m)}
          aria-haspopup="menu"
          aria-expanded={menu}
        >
          ⚙️ Host{queue.length ? ` · ${queue.length} waiting` : ''}
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
            <div role="menu" className="absolute right-0 top-full mt-2 z-40 w-64 rounded-2xl bg-white p-2 shadow-2xl">
              {menuItem(`🎟️ Queue${queue.length ? ` (${queue.length})` : ''}`, () => togglePanel('queue'))}
              {menuItem('📜 Lyrics', () => togglePanel('lyrics'))}
              {menuItem(semitones ? `🎚️ Key (${semitones > 0 ? '+' : ''}${semitones})` : '🎚️ Key', () => togglePanel('key'))}
              {menuItem('➕ Add songs', () => togglePanel('add'))}
              {menuItem('🛠️ Remove songs', () => { reload(); setAdminMode(true); setPicking(true) })}
              <div className="my-1 border-t border-violet-100" />
              {menuItem(stageMode === 'visualizer' ? '🎬 Show the video' : '🌈 Show the visualizer', () => setMode(stageMode === 'visualizer' ? 'video' : 'visualizer'))}
              {menuItem('⛶ Full screen', toggleFullscreen)}
            </div>
          </>
        )}
      </header>

      {/* the stage: video (or visualizer) with karaoke lyrics on top */}
      <main className="flex flex-col items-center gap-3 lg:flex-1 lg:min-h-0">
        <div className={`${stageWidth} relative aspect-video rounded-3xl overflow-hidden bg-black shadow-2xl`}>
          <YouTubePlayer ref={player} videoId={current?.videoId} autoplay={started && !holding} onEnded={onEnded} onPlayingChange={setPlaying} onError={onPlayerError} />
          {stageMode === 'visualizer' && (
            <div className="absolute inset-0 z-[5]">
              <Visualizer playing={playing} />
            </div>
          )}
          <LyricsOverlay lyrics={lyrics} getTime={() => player.current?.getTime() ?? 0} getDuration={() => player.current?.getDuration() ?? 0} />
          {holding && !playerError && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-violet-900/85 text-white text-center p-6">
              <div>
                <p className="text-lg sm:text-3xl opacity-80">Get ready!</p>
                <p className="text-4xl sm:text-7xl font-extrabold">🎤 {current.singer}</p>
                <p className="text-xl sm:text-4xl mt-2">{current.title}</p>
                <p className="text-7xl sm:text-9xl font-extrabold mt-6" aria-live="polite">{count > 0 ? count : '🎶'}</p>
                <button className="mt-4 rounded-xl px-5 py-2 bg-white/20 hover:bg-white/30 font-semibold" onClick={() => setReadyId(current.id)}>Start now ▶</button>
              </div>
            </div>
          )}
          {playerError && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-violet-900/90 text-white text-center p-6">
              <p className="text-2xl sm:text-4xl font-bold">😕 This video can't be played here. Skipping…</p>
            </div>
          )}
          {!started && (
            <button
              onClick={() => setStarted(true)}
              className="absolute inset-0 z-20 grid place-items-center bg-violet-900/90 text-white text-3xl sm:text-5xl font-bold hover:bg-violet-800 transition"
            >
              🎉 Tap to start the party!
            </button>
          )}
          {started && !current && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-violet-900/90 text-white text-center p-6">
              <div>
                <p className="text-3xl sm:text-5xl font-bold mb-6">Who's up next? 🎶</p>
                <button className="big-btn !text-2xl !px-8 bg-yellow-300 text-violet-800" onClick={openPicker}>🎵 Pick a song!</button>
              </div>
            </div>
          )}
        </div>

        <div className={`${stageWidth} rounded-2xl bg-white/90 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2`}>
          <div className="min-w-0 mr-auto">
            <p className="text-xl sm:text-2xl lg:text-4xl font-bold truncate">{current ? current.title : 'Waiting for a singer…'}</p>
            {current && <p className="text-base sm:text-lg lg:text-2xl text-pink-600 font-semibold">🎤 {current.singer}{semitones ? <span className="ml-3 text-sm text-teal-700">🎚️ Key {semitones > 0 ? '+' : ''}{semitones}</span> : null}</p>}
          </div>
          {queue[0] && (
            <p className="text-sm sm:text-base lg:text-lg text-slate-600 truncate max-w-[34%]">
              Up next: <b>{queue[0].singer}</b> · {queue[0].title}{queue.length > 1 ? ` (+${queue.length - 1})` : ''}
            </p>
          )}
          <div className="flex gap-2">
            <button className="rounded-lg px-3 py-1.5 bg-violet-100 text-violet-800 font-semibold disabled:opacity-40" disabled={!current} onClick={() => player.current?.togglePlay()}>{playing ? '⏸️ Pause' : '▶️ Play'}</button>
            <button className="rounded-lg px-3 py-1.5 bg-sky-100 text-sky-800 font-semibold disabled:opacity-40" disabled={!current} onClick={() => player.current?.restart()}>🔁 Restart</button>
            <button className="rounded-lg px-3 py-1.5 bg-green-100 text-green-800 font-semibold disabled:opacity-40" disabled={!current && !queue.length} onClick={actions.next}>⏭️ Next</button>
          </div>
        </div>
      </main>

      {/* secondary tools slide in from the side and can be closed */}
      {/* always mounted (just hidden) so the key changer keeps running while the panel is closed */}
      {(
        <>
        <div
          className={`fixed inset-0 z-20 bg-black/40 transition-opacity duration-300 ${panel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setPanel(null)}
        />
        <aside
          aria-hidden={!panel}
          className={`fixed inset-y-0 right-0 z-30 w-full sm:w-[440px] overflow-y-auto bg-violet-50 shadow-2xl p-4 space-y-4 transition-transform duration-300 ease-out ${panel ? 'translate-x-0' : 'translate-x-full invisible'}`}
          style={{ transitionProperty: 'transform, visibility' }}
        >
          <div className="flex items-center">
            <h2 className="text-xl font-bold text-violet-800 mr-auto">
              {{ queue: '🎟️ Queue', lyrics: '📜 Lyrics', key: '🎚️ Key changer', add: '➕ Add songs' }[panel] ?? ''}
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
          {panel === 'lyrics' && <LyricsPanel lyrics={lyrics} onChange={actions.patchCurrent} />}
          <div className={panel === 'key' ? '' : 'hidden'}>
            <PitchControls semitones={semitones} onChange={setSemitones} />
          </div>
          {panel === 'add' && (
            <>
              <LibraryAdmin library={library} save={saveLibrary} auth={auth} usingDb={usingDb} canEdit={canEdit} dbError={libraryError} missingStarters={missingStarters} addStarters={addStarters} />
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
        </>
      )}

      {toast && (
        <div key={toast.id} className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-white px-6 py-3 text-lg sm:text-2xl font-bold text-violet-800 shadow-2xl animate-pop" role="status">
          {toast.text}
        </div>
      )}

      {picking && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-gradient-to-br from-violet-600 via-pink-600 to-orange-500 p-4 sm:p-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-3xl sm:text-5xl font-bold text-white drop-shadow mr-auto">🎵 Pick a song!</h2>
              {adminMode && (
                <button className="big-btn !text-xl bg-rose-500 text-white" onClick={() => { setAdminMode(false); setPicking(false) }}>🛠️ Done removing</button>
              )}
              <button className="big-btn !text-2xl bg-white text-violet-700" onClick={() => { setPicking(false); setAdminMode(false) }}>✖ Close</button>
            </div>
            <SongPicker
              library={library}
              queuedIds={[current, ...queue].filter(Boolean).map((s) => s.videoId)}
              onPick={actions.addFromLibrary}
              admin={adminMode}
              onRemove={(song) => saveLibrary(library.filter((x) => x.videoId !== song.videoId))}
              adminNeedsSignIn={!canEdit ? auth : null}
              dbError={libraryError}
            />
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useSharedState } from './hooks/useSharedState.js'
import YouTubePlayer from './components/YouTubePlayer.jsx'
import AddSongForm from './components/AddSongForm.jsx'
import Queue from './components/Queue.jsx'
import Lyrics from './components/Lyrics.jsx'
import PitchControls from './components/PitchControls.jsx'
import SoundBoard from './components/SoundBoard.jsx'
import RemoteView from './components/RemoteView.jsx'
import { applause } from './lib/sfx.js'
import { confettiCannons } from './lib/confetti.js'

const isRemote = new URLSearchParams(location.search).has('remote')

export default function App() {
  const [state, update] = useSharedState()
  const [started, setStarted] = useState(false)
  const [tvMode, setTvMode] = useState(false)
  const [autoNext, setAutoNext] = useState(true)
  const [semitones, setSemitones] = useState(0)
  const [addresses, setAddresses] = useState([])
  const player = useRef(null)
  const { queue, current } = state

  const actions = {
    add: (song) =>
      update((s) => (s.current ? { ...s, queue: [...s.queue, song] } : { ...s, current: song })),
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
    setLyrics: (lyrics) =>
      update((s) => (s.current ? { ...s, current: { ...s.current, lyrics } } : s)),
  }

  // each new song starts in its original key
  useEffect(() => setSemitones(0), [current?.id])

  useEffect(() => {
    fetch('/api/info').then((r) => r.json()).then((d) => setAddresses(d.addresses)).catch(() => {})
  }, [])

  const onEnded = () => {
    applause()
    confettiCannons()
    if (autoNext) setTimeout(actions.next, 5000)
  }

  if (isRemote) return <RemoteView state={state} actions={actions} />

  const phoneUrl = addresses[0] ? `http://${addresses[0]}:${location.port}/?remote` : null

  return (
    <div className="max-w-[1600px] mx-auto p-3 sm:p-6">
      <header className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-3xl sm:text-5xl font-bold text-white drop-shadow mr-auto animate-wiggle">🎤 Karaoke Party! 🎉</h1>
        <label className="flex items-center gap-2 text-white font-semibold">
          <input type="checkbox" className="w-5 h-5" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} />
          Auto-play next
        </label>
        <button className="big-btn bg-white text-violet-700" onClick={() => setTvMode((t) => !t)}>
          {tvMode ? '🛠️ Show controls' : '📺 TV mode'}
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <main className="space-y-4 min-w-0">
          <div className="relative aspect-video rounded-3xl overflow-hidden bg-black shadow-2xl">
            <YouTubePlayer ref={player} videoId={current?.videoId} autoplay={started} onEnded={onEnded} />
            {!started && (
              <button
                onClick={() => { setStarted(true); applause() }}
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

          <Lyrics lyrics={current?.lyrics ?? ''} onChange={actions.setLyrics} />
          <SoundBoard />
        </main>

        <aside className="space-y-4">
          <Queue queue={queue} onPlay={actions.playNow} onRemove={actions.remove} onMoveUp={actions.moveUp} />
          {!tvMode && <AddSongForm onAdd={actions.add} />}
          <PitchControls semitones={semitones} onChange={setSemitones} />
          {!tvMode && phoneUrl && (
            <div className="card text-center">
              <p className="font-bold text-violet-700">📱 Add songs from a phone</p>
              <p className="text-sm text-slate-600">Same Wi-Fi, then open:</p>
              <p className="font-mono font-bold break-all">{phoneUrl}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

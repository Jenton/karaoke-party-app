import { useEffect, useRef, useState } from 'react'
import YouTubePlayer from './components/YouTubePlayer.jsx'
import { openChannel } from './lib/popout.js'

// The page in the pop-out window: just the video, driven by the main page.
export default function PopupPlayer() {
  const [video, setVideo] = useState({ id: null, autoplay: false, startAt: 0 })
  const [needsClick, setNeedsClick] = useState(false)
  const [status, setStatus] = useState('Loading the YouTube player…')
  const [problem, setProblem] = useState('')
  const [log, setLog] = useState([])
  const ready = useRef(false)
  const debug = (m) => setLog((l) => [...l.slice(-5), m])
  const player = useRef(null)
  const ch = useRef(null)
  const playing = useRef(false)
  const loadedAt = useRef(0)
  const videoId = useRef(null)

  useEffect(() => {
    document.title = '🎤 Karaoke player (share this tab)'
    const c = openChannel()
    ch.current = c
    c.onmessage = ({ data: m }) => {
      const p = player.current
      if (m.type === 'ping') c.postMessage({ type: 'hello' })
      else if (m.type === 'load') { loadedAt.current = Date.now(); videoId.current = m.videoId; setProblem(''); setStatus(m.videoId ? 'Loading the song…' : 'Waiting for a song…'); setVideo({ id: m.videoId, autoplay: m.autoplay, startAt: m.startAt }) }
      else if (m.type === 'toggle') p?.togglePlay()
      else if (m.type === 'seekTo') p?.seekTo(m.sec)
      else if (m.type === 'seekBy') p?.seekBy(m.sec)
      else if (m.type === 'restart') p?.restart()
      else if (m.type === 'forcePlay') p?.forcePlay()
    }
    c.postMessage({ type: 'hello' })
    const mountedAt = Date.now()
    const tick = setInterval(() => {
      const p = player.current
      if (!p) return
      c.postMessage({ type: 'state', time: p.getTime(), duration: p.getDuration(), playing: playing.current })
      if (!ready.current && Date.now() - mountedAt > 10000) setProblem("YouTube's player didn't respond. Try the reload button below.")
      // nothing started within a few seconds: the browser wants a click in this window first
      if (videoId.current && !playing.current && loadedAt.current && Date.now() - loadedAt.current > 3500) setNeedsClick(true)
    }, 500)
    return () => { clearInterval(tick); c.close() }
  }, [])

  const start = () => {
    if (!player.current) return setProblem("The YouTube player hasn't loaded yet. Wait a moment and click again.")
    setProblem('')
    player.current.forcePlay()
    setNeedsClick(false)
    loadedAt.current = Date.now()
  }
  const errorText = (code) =>
    ({ 2: 'bad video link', 5: 'player error', 100: 'video removed or private', 101: "the owner doesn't allow embedding", 150: "the owner doesn't allow embedding" })[code] || 'unknown error'

  return (
    <div className="fixed inset-0 bg-black text-white">
      <div className="absolute inset-0">
        <YouTubePlayer
          ref={player}
          videoId={video.id}
          startAt={video.startAt}
          autoplay={video.autoplay}
          onEnded={() => ch.current?.postMessage({ type: 'ended' })}
          onDebug={debug}
          onReady={() => { ready.current = true; setStatus('Player ready') }}
          onState={(n) => setStatus(`Player: ${({ '-1': 'not started', 0: 'ended', 1: 'playing', 2: 'paused', 3: 'buffering', 5: 'ready' })[n] ?? n}`)}
          onApiFailed={() => setProblem("Couldn't load YouTube. Check the internet connection and that nothing blocks youtube.com, then close this window and turn the key changer on again.")}
          onPlayingChange={(p) => { playing.current = p; if (p) { setNeedsClick(false); setProblem('') } }}
          onError={(code) => { setNeedsClick(false); setProblem(`YouTube can't play this video here (${errorText(code)}). The main screen will try the other version.`); ch.current?.postMessage({ type: 'error', code }) }}
          onBlocked={() => setNeedsClick(true)}
        />
      </div>
      {needsClick && (
        <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-center gap-3 bg-violet-700 p-2 text-sm font-semibold">
          <span>Nothing playing yet.</span>
          <button onClick={start} className="rounded-lg bg-white px-3 py-1 font-bold text-violet-800">▶️ Start the song</button>
          <span className="hidden sm:inline">or click the video's own ▶ button</span>
        </div>
      )}
      {problem && <p className="absolute inset-x-0 top-10 z-20 bg-rose-700 p-2 text-center text-sm font-semibold">{problem}</p>}
      <div className="absolute inset-x-0 bottom-6 z-20 bg-black/70 p-1 text-center text-[10px] leading-tight opacity-80">
        {log.join(' → ')} <button className="ml-2 underline" onClick={() => window.location.reload()}>reload this window</button>
      </div>
      <p className="absolute inset-x-0 bottom-0 z-20 bg-black/70 p-1 text-center text-xs">
        {status} · keep this window open · its sound plays from the main screen
      </p>
    </div>
  )
}

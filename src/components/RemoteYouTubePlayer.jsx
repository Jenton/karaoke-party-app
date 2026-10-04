import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { openChannel, popoutOpen } from '../lib/popout.js'

// Same controls as YouTubePlayer, but the video plays in the pop-out window (see PopupPlayer.jsx).
const RemoteYouTubePlayer = forwardRef(function RemoteYouTubePlayer({ videoId, autoplay, startAt, onEnded, onPlayingChange, onError, onClosed }, ref) {
  const ch = useRef(null)
  const latest = useRef({})
  latest.current = { videoId, autoplay, onEnded, onPlayingChange, onError, onClosed }
  const st = useRef({ time: 0, at: 0, duration: 0, playing: false })
  const sentId = useRef(null)
  const firstStart = useRef({ id: videoId, at: startAt || 0 })

  const send = (msg) => ch.current?.postMessage(msg)
  const load = () => {
    const { videoId: id, autoplay: auto } = latest.current
    if (id === sentId.current) return
    sentId.current = id
    const at = firstStart.current.id === id ? firstStart.current.at : 0
    firstStart.current = { id: null, at: 0 }
    send({ type: 'load', videoId: id || null, autoplay: !!auto, startAt: at })
  }

  useEffect(() => {
    const c = openChannel()
    ch.current = c
    c.onmessage = ({ data: m }) => {
      if (m.type === 'hello') { sentId.current = null; load() }
      else if (m.type === 'state') {
        const was = st.current.playing
        st.current = { time: m.time, at: Date.now(), duration: m.duration, playing: m.playing }
        if (was !== m.playing) latest.current.onPlayingChange?.(m.playing)
      } else if (m.type === 'ended') latest.current.onEnded?.()
      else if (m.type === 'error') latest.current.onError?.(m.code)
    }
    c.postMessage({ type: 'ping' }) // popup answers with 'hello' once it is ready
    const watch = setInterval(() => { if (!popoutOpen()) latest.current.onClosed?.() }, 1000)
    return () => { clearInterval(watch); c.close(); ch.current = null }
  }, [])

  useEffect(load, [videoId, autoplay])

  useImperativeHandle(ref, () => ({
    seekTo: (sec) => { st.current.time = sec; st.current.at = Date.now(); send({ type: 'seekTo', sec }) },
    seekBy: (sec) => send({ type: 'seekBy', sec }),
    forcePlay: () => send({ type: 'forcePlay' }),
    getDuration: () => st.current.duration,
    togglePlay: () => send({ type: 'toggle' }),
    getTime: () => st.current.time + (st.current.playing ? (Date.now() - st.current.at) / 1000 : 0),
    restart: () => send({ type: 'restart' }),
  }))

  return (
    <div className="absolute inset-0 grid place-items-center bg-black p-4 text-center text-white">
      <p className="text-lg font-semibold">🎚️ The song is playing in the key-changer window.<br /><span className="text-sm opacity-70">Keep that window open (you can minimise it).</span></p>
    </div>
  )
})

export default RemoteYouTubePlayer

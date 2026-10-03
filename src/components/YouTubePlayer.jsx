import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { loadYouTubeApi } from '../lib/youtube.js'

// Wraps the YouTube Iframe API. Loads `videoId` whenever it changes and calls onEnded at the end.
const YouTubePlayer = forwardRef(function YouTubePlayer({ videoId, autoplay, onEnded, onPlayingChange, onError, onBlocked, onApiFailed }, ref) {
  const mount = useRef(null)
  const player = useRef(null)
  const latest = useRef({ videoId, autoplay, onEnded })
  latest.current = { videoId, autoplay, onEnded, onPlayingChange, onError, onBlocked, onApiFailed }
  const loadedId = useRef(null)
  const hasStarted = useRef(null) // the video id we last asked to *play* (not just cue)

  const sync = () => {
    const p = player.current
    const { videoId: id, autoplay: auto } = latest.current
    if (!p?.loadVideoById || id === loadedId.current) return
    loadedId.current = id
    if (id) auto ? p.loadVideoById(id) : p.cueVideoById(id)
    else p.stopVideo()
    if (id && auto) hasStarted.current = id
  }

  useImperativeHandle(ref, () => ({
    seekTo: (sec) => player.current?.seekTo?.(sec, true),
    seekBy: (sec) => {
      const p = player.current
      if (p?.getCurrentTime) p.seekTo(Math.max(0, p.getCurrentTime() + sec), true)
    },
    // reload and play from a user tap (works when the browser blocked the automatic start)
    forcePlay: () => {
      const p = player.current
      if (p?.loadVideoById && latest.current.videoId) {
        loadedId.current = latest.current.videoId
        p.loadVideoById(latest.current.videoId)
      }
    },
    getDuration: () => player.current?.getDuration?.() ?? 0,
    togglePlay: () => {
      const p = player.current
      if (!p?.getPlayerState) return
      p.getPlayerState() === 1 ? p.pauseVideo() : p.playVideo()
    },
    getTime: () => player.current?.getCurrentTime?.() ?? 0,
    restart: () => {
      player.current?.seekTo?.(0, true)
      player.current?.playVideo?.()
    },
  }))

  // create the player once
  useEffect(() => {
    let cancelled = false
    const watchdog = setTimeout(() => { if (!window.YT?.Player && !cancelled) latest.current.onApiFailed?.() }, 8000)
    loadYouTubeApi().then((YT) => {
      clearTimeout(watchdog)
      if (cancelled) return
      const el = document.createElement('div')
      mount.current.appendChild(el)
      loadedId.current = latest.current.videoId || null
      player.current = new YT.Player(el, {
        width: '100%',
        height: '100%',
        videoId: latest.current.videoId || undefined,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, autoplay: latest.current.autoplay ? 1 : 0 },
        events: {
          onReady: sync,
          onStateChange: (e) => {
            latest.current.onPlayingChange?.(e.data === YT.PlayerState.PLAYING)
            if (e.data === YT.PlayerState.ENDED) latest.current.onEnded?.()
          },
          // 2 bad id, 5 html5 error, 100 removed/private, 101/150 embedding not allowed
          onError: (e) => latest.current.onError?.(e.data),
          // the browser refused to start playback by itself
          onAutoplayBlocked: () => latest.current.onBlocked?.(),
        },
      })
    })
    return () => {
      cancelled = true
      clearTimeout(watchdog)
      player.current?.destroy?.()
      player.current = null
    }
  }, [])

  // autoplay turned on while the video is already cued (tap-to-start, or the end of the get-ready countdown)
  useEffect(() => {
    const p = player.current
    const id = latest.current.videoId
    if (autoplay && id && p?.loadVideoById && hasStarted.current !== id) {
      hasStarted.current = id
      p.loadVideoById(id)
    }
  }, [autoplay])

  // swap the video when the song changes
  useEffect(sync, [videoId, autoplay])

  return <div ref={mount} className="absolute inset-0 [&>iframe]:w-full [&>iframe]:h-full" />
})

export default YouTubePlayer

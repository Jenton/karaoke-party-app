import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { loadYouTubeApi } from '../lib/youtube.js'

// Wraps the YouTube Iframe API. Loads `videoId` whenever it changes and calls onEnded at the end.
const YouTubePlayer = forwardRef(function YouTubePlayer({ videoId, autoplay, onEnded }, ref) {
  const mount = useRef(null)
  const player = useRef(null)
  const latest = useRef({ videoId, autoplay, onEnded })
  latest.current = { videoId, autoplay, onEnded }
  const loadedId = useRef(null)

  const sync = () => {
    const p = player.current
    const { videoId: id, autoplay: auto } = latest.current
    if (!p?.loadVideoById || id === loadedId.current) return
    loadedId.current = id
    if (id) auto ? p.loadVideoById(id) : p.cueVideoById(id)
    else p.stopVideo()
  }

  useImperativeHandle(ref, () => ({
    getTime: () => player.current?.getCurrentTime?.() ?? 0,
    restart: () => {
      player.current?.seekTo?.(0, true)
      player.current?.playVideo?.()
    },
  }))

  // create the player once
  useEffect(() => {
    let cancelled = false
    loadYouTubeApi().then((YT) => {
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
          onStateChange: (e) => e.data === YT.PlayerState.ENDED && latest.current.onEnded?.(),
        },
      })
    })
    return () => {
      cancelled = true
      player.current?.destroy?.()
      player.current = null
    }
  }, [])

  // swap the video when the song changes
  useEffect(sync, [videoId, autoplay])

  return <div ref={mount} className="absolute inset-0 [&>iframe]:w-full [&>iframe]:h-full" />
})

export default YouTubePlayer

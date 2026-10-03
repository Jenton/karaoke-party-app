import { useEffect, useRef, useState } from 'react'

// font size in vw so it scales with the screen
const SIZES = [2.2, 2.8, 3.4, 4.1, 4.9]
const size = (i, scale = 1) => `clamp(1.25rem, ${SIZES[i] * scale}vw, 5rem)`
const outline = { textShadow: '0 0 10px #000, 0 3px 6px #000, 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000' }

// Karaoke-style lyrics drawn on top of the video / visualizer.
//  - timed lyrics: current line at the bottom with a colour wipe, next line below it
//  - plain lyrics: a translucent panel that auto-scrolls with the song's progress
export default function LyricsOverlay({ lyrics, getTime, getDuration }) {
  const { song, lines, synced, offset, size: sizeIdx } = lyrics
  const [now, setNow] = useState(0)
  const panel = useRef(null)
  const hasPlain = !!song?.lyrics?.trim()

  useEffect(() => {
    if (!song || (!synced && !hasPlain)) return
    const id = setInterval(() => setNow(getTime()), 100)
    return () => clearInterval(id)
  }, [song?.id, synced, hasPlain, getTime])

  // plain lyrics: scroll in proportion to how far through the song we are
  useEffect(() => {
    const el = panel.current
    if (!el || synced) return
    const dur = getDuration() || 0
    if (dur > 0) el.scrollTop = Math.min(1, Math.max(0, now / dur)) * (el.scrollHeight - el.clientHeight)
  }, [now, synced, getDuration])

  if (!song) return null

  if (synced) {
    let active = -1
    for (let i = 0; i < lines.length; i++) if (lines[i].t + offset <= now) active = i
    const cur = lines[active]
    const next = lines[active + 1] ?? (active < 0 ? lines[0] : null)
    let p = 0
    if (cur) {
      const gap = (lines[active + 1]?.t ?? cur.t + 6) - cur.t
      p = Math.min(1, Math.max(0, (now - offset - cur.t) / (Math.min(gap, 8) * 0.85)))
    }
    const text = cur ? cur.text || '♪ ♪ ♪' : '♪ ♪ ♪'
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-[4%] pt-24 pb-[3%] bg-gradient-to-t from-black/75 via-black/40 to-transparent text-center">
        <p className="relative inline-block font-extrabold leading-tight text-white" style={{ fontSize: size(sizeIdx), ...outline }}>
          {text}
          <span
            aria-hidden
            className="absolute inset-0 text-yellow-300"
            style={{ clipPath: `inset(0 ${100 - p * 100}% 0 0)`, ...outline }}
          >
            {text}
          </span>
        </p>
        <p className="mt-2 font-bold leading-tight text-white/70 truncate" style={{ fontSize: size(sizeIdx, 0.72), ...outline }}>
          {next?.text || ' '}
        </p>
      </div>
    )
  }

  if (hasPlain) {
    return (
      <div
        ref={panel}
        className="absolute right-[2%] top-[3%] bottom-[3%] z-10 w-[46%] overflow-y-auto rounded-3xl bg-black/60 px-5 py-4 text-center font-bold leading-snug whitespace-pre-wrap text-yellow-100"
        style={{ fontSize: size(sizeIdx, 0.75), ...outline }}
      >
        {song.lyrics}
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4 text-center text-white/80 bg-gradient-to-t from-black/60 to-transparent">
      <p className="text-lg font-semibold" style={outline}>No lyrics yet · open 📜 Lyrics to find or paste them</p>
    </div>
  )
}

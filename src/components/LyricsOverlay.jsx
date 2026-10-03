import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { censor } from '../lib/profanity.js'

// font size in vw so it scales with the screen
const SIZES = [3.2, 4, 4.9, 5.9, 7]
const size = (i, scale = 1) => `clamp(1.5rem, ${SIZES[i] * scale}vw, 8rem)`
const outline = { textShadow: '0 0 10px #000, 0 3px 6px #000, 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000' }

// One lyric row. It measures its own text and shrinks just enough to fit the stage width, so lines of any
// length stay on a single row and stay centred (flex centring keeps overflow symmetrical).
function Line({ text, y, scale, opacity, p }) {
  const box = useRef(null)
  const span = useRef(null)
  const [avail, setAvail] = useState(0)
  const [natural, setNatural] = useState(0)

  useLayoutEffect(() => {
    const measure = () => {
      setAvail(box.current?.clientWidth ?? 0)
      setNatural(span.current?.offsetWidth ?? 0) // offsetWidth ignores transforms
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(box.current)
    ro.observe(span.current)
    return () => ro.disconnect()
  }, [text])

  const fit = natural && avail ? Math.min(1, (avail * 0.96) / (natural * scale)) : 1
  return (
    <div
      ref={box}
      className="absolute inset-x-0 top-0 flex justify-center font-extrabold leading-tight whitespace-nowrap"
      style={{
        transform: `translateY(${y}em) scale(${(scale * fit).toFixed(3)})`,
        transformOrigin: '50% 0',
        opacity,
        transition: 'transform 800ms cubic-bezier(.45,.05,.25,1), opacity 700ms ease',
        willChange: 'transform, opacity',
      }}
    >
      <span ref={span} className="relative inline-block shrink-0 text-white" style={outline}>
        {text}
        <span
          aria-hidden
          className="absolute inset-0 text-yellow-300"
          style={{ clipPath: `inset(0 ${100 - p * 100}% 0 0)`, transition: 'clip-path 120ms linear', ...outline }}
        >
          {text}
        </span>
      </span>
    </div>
  )
}

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
    // a leading "instrumental" line so something is always on the top row, even before the first lyric
    const rows = [{ t: -1, text: '' }, ...lines]
    let active = 0
    for (let i = 0; i < rows.length; i++) if (rows[i].t + offset <= now) active = i
    const first = Math.max(0, active - 2)
    const visible = rows.slice(first, active + 4)

    // where each row sits relative to the current one:
    //   -1 slides up and fades out | 0 top row, full size | 1 second row, smaller | 2 waiting below, invisible
    const slot = (rel) => {
      if (rel === 0) return { y: 0, scale: 1, opacity: 1 }
      if (rel === 1) return { y: 1.3, scale: 0.7, opacity: 0.78 }
      if (rel === 2) return { y: 2.1, scale: 0.6, opacity: 0 }
      if (rel === -1) return { y: -1.2, scale: 0.92, opacity: 0 }
      return { y: rel < 0 ? -2 : 2.6, scale: 0.6, opacity: 0 }
    }

    return (
      <>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[52%] bg-gradient-to-t from-black/70 via-black/35 to-transparent" />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-[13%] z-10 px-[4%]"
          style={{ fontSize: size(sizeIdx), height: '2.3em' }}
        >
          {visible.map((row, k) => {
            const idx = first + k
            const rel = idx - active
            const { y, scale, opacity } = slot(rel)
            const text = censor(row.text) || '♪ ♪ ♪'
            // colour wipe: done for lines already sung, empty for the ones to come
            let p = rel < 0 ? 1 : 0
            if (rel === 0) {
              const gap = (rows[idx + 1]?.t ?? row.t + 6) - Math.max(row.t, 0)
              p = Math.min(1, Math.max(0, (now - offset - Math.max(row.t, 0)) / (Math.min(gap, 8) * 0.85)))
            }
            return <Line key={idx} text={text} y={y} scale={scale} opacity={opacity} p={p} />
          })}
        </div>
      </>
    )
  }

  if (hasPlain) {
    return (
      <div
        ref={panel}
        className="absolute right-[2%] top-[3%] bottom-[3%] z-10 w-[46%] overflow-y-auto rounded-3xl bg-black/60 px-5 py-4 text-center font-bold leading-snug whitespace-pre-wrap text-yellow-100"
        style={{ fontSize: size(sizeIdx, 0.75), ...outline }}
      >
        {censor(song.lyrics)}
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4 text-center text-white/80 bg-gradient-to-t from-black/60 to-transparent">
      <p className="text-lg font-semibold" style={outline}>No lyrics yet · open 📜 Lyrics to find or paste them</p>
    </div>
  )
}

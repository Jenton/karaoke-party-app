import { useEffect, useState } from 'react'

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

// Progress bar you can drag to jump around the song.
export default function SeekBar({ getTime, getDuration, seekTo, disabled }) {
  const [t, setT] = useState(0)
  const [d, setD] = useState(0)
  const [drag, setDrag] = useState(null)

  useEffect(() => {
    const id = setInterval(() => {
      setT(getTime())
      setD(getDuration())
    }, 400)
    return () => clearInterval(id)
  }, [getTime, getDuration])

  const shown = drag ?? t
  return (
    <div className="flex items-center gap-3 w-full">
      <span className="w-12 text-right tabular-nums text-sm text-slate-600">{fmt(shown)}</span>
      <input
        type="range"
        aria-label="Song position"
        className="flex-1 h-3 accent-pink-500 disabled:opacity-40"
        min={0}
        max={Math.max(1, Math.floor(d))}
        step={1}
        value={Math.min(shown, Math.max(1, d))}
        disabled={disabled || !d}
        onChange={(e) => setDrag(Number(e.target.value))}
        onPointerUp={(e) => {
          if (drag != null) { seekTo(drag); setT(drag); setDrag(null) }
          e.currentTarget.blur() // so the keyboard shortcuts (space, arrows) keep working
        }}
        onKeyUp={() => { if (drag != null) { seekTo(drag); setT(drag); setDrag(null) } }}
      />
      <span className="w-12 tabular-nums text-sm text-slate-600">{fmt(d)}</span>
    </div>
  )
}

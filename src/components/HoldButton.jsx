import { useRef, useState } from 'react'

// A deliberately fiddly button: it only fires after being held for about a second, so curious
// kids tapping around don't end up in the host tools by accident.
export default function HoldButton({ onHold, label, hint, ms = 900 }) {
  const timer = useRef(null)
  const [holding, setHolding] = useState(false)

  const start = () => {
    setHolding(true)
    timer.current = setTimeout(() => {
      setHolding(false)
      onHold()
    }, ms)
  }
  const stop = () => {
    clearTimeout(timer.current)
    setHolding(false)
  }

  return (
    <button
      type="button"
      title={hint}
      aria-label={hint}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onHold() } }}
      className="relative overflow-hidden rounded-xl px-3 py-2 text-sm font-semibold text-white/70 bg-white/10 hover:bg-white/20 select-none touch-none"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-white/40"
        style={{ width: holding ? '100%' : '0%', transition: holding ? `width ${ms}ms linear` : 'none' }}
      />
      <span className="relative">{label}</span>
    </button>
  )
}

import { useEffect, useRef } from 'react'
import { getAnalyser } from '../lib/pitch.js'

// Colourful animated backdrop that stands in for the video.
// It reacts to the real music when the key changer is on (we can hear the tab audio then);
// otherwise it dances to a built-in beat so it still looks lively.
export default function Visualizer({ playing }) {
  const canvas = useRef(null)
  const live = useRef(playing)
  live.current = playing

  useEffect(() => {
    const c = canvas.current
    const ctx = c.getContext('2d')
    let raf
    let energy = 0 // eases toward 1 while playing, 0 when paused
    const N = 56
    const confetti = Array.from({ length: 36 }, (_, i) => ({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random(), h: i * 10, v: 0.02 + Math.random() * 0.05 }))
    let freq = null

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      c.width = c.clientWidth * dpr
      c.height = c.clientHeight * dpr
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(c)

    const frame = (ms) => {
      const t = ms / 1000
      const w = c.width, h = c.height, m = Math.min(w, h)
      energy += ((live.current ? 1 : 0.15) - energy) * 0.05

      // levels per bar: real audio if available, else a synthetic beat
      const an = getAnalyser()
      if (an && (!freq || freq.length !== an.frequencyBinCount)) freq = new Uint8Array(an.frequencyBinCount)
      if (an) an.getByteFrequencyData(freq)
      const beat = Math.pow(0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 2), 3) // ~120 bpm pulse
      const level = (i) =>
        an
          ? (freq[Math.floor((i / N) * freq.length * 0.7)] / 255) * energy
          : (0.25 + 0.75 * Math.abs(Math.sin(t * 2.4 + i * 0.37 + Math.sin(t * 1.3 + i)))) * (0.45 + 0.55 * beat) * energy
      let bass = 0
      for (let i = 0; i < 6; i++) bass += level(i) / 6

      // rainbow background that slowly drifts
      const hue = (t * 20) % 360
      const g = ctx.createLinearGradient(0, 0, w, h)
      g.addColorStop(0, `hsl(${hue}, 85%, 32%)`)
      g.addColorStop(0.5, `hsl(${hue + 70}, 85%, 40%)`)
      g.addColorStop(1, `hsl(${hue + 150}, 85%, 34%)`)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      // floating confetti
      for (const p of confetti) {
        p.y -= p.v * 0.01 * (0.5 + energy * 2)
        if (p.y < -0.05) { p.y = 1.05; p.x = Math.random() }
        ctx.fillStyle = `hsla(${p.h + t * 40}, 90%, 70%, 0.55)`
        const r = m * 0.012 * p.s * (1 + bass * 1.5)
        ctx.beginPath()
        ctx.arc(p.x * w + Math.sin(t + p.h) * m * 0.02, p.y * h, r, 0, Math.PI * 2)
        ctx.fill()
      }

      // radial bars + pulsing core
      const cx = w / 2, cy = h * 0.46, r0 = m * (0.16 + bass * 0.04)
      ctx.lineCap = 'round'
      ctx.lineWidth = m * 0.016
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + t * 0.15
        const len = m * (0.03 + level(i) * 0.26)
        ctx.strokeStyle = `hsl(${(i / N) * 360 + t * 40}, 95%, 62%)`
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0)
        ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len))
        ctx.stroke()
      }
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r0)
      core.addColorStop(0, `hsla(${hue + 200}, 100%, 85%, 0.95)`)
      core.addColorStop(1, `hsla(${hue + 300}, 100%, 60%, 0.6)`)
      ctx.fillStyle = core
      ctx.beginPath()
      ctx.arc(cx, cy, r0 * (0.9 + bass * 0.25), 0, Math.PI * 2)
      ctx.fill()

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])

  return <canvas ref={canvas} className="absolute inset-0 w-full h-full" />
}

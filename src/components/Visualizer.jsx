import { useEffect, useRef } from 'react'
import { getAnalyser } from '../lib/pitch.js'

// A calm, dark-to-plum backdrop with slow glowing light and a soft ring of thin bars.
// Kept deliberately quiet so the lyrics stay the star. It follows the real music while the
// key changer is on (we can hear the tab audio then); otherwise it breathes to a gentle built-in beat.
const N = 72
const hsl = (h, s, l, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`

export default function Visualizer({ playing }) {
  const canvas = useRef(null)
  const live = useRef(playing)
  live.current = playing

  useEffect(() => {
    const c = canvas.current
    const ctx = c.getContext('2d')
    let raf
    let energy = 0
    const smooth = new Float32Array(N)
    let freq = null
    // a handful of big, slow light blobs (position/orbit speeds are fixed per blob)
    const blobs = [
      { hue: 322, x: 0.25, y: 0.3, r: 0.5, sx: 0.07, sy: 0.05, a: 0.2 },
      { hue: 268, x: 0.75, y: 0.35, r: 0.55, sx: 0.05, sy: 0.08, a: 0.24 },
      { hue: 292, x: 0.5, y: 0.85, r: 0.6, sx: 0.06, sy: 0.04, a: 0.18 },
      { hue: 215, x: 0.85, y: 0.8, r: 0.38, sx: 0.04, sy: 0.06, a: 0.1 },
    ]
    // a few tiny specks that drift upward very slowly
    const specks = Array.from({ length: 22 }, () => ({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random(), v: 0.004 + Math.random() * 0.01 }))

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      c.width = c.clientWidth * dpr
      c.height = c.clientHeight * dpr
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(c)

    const frame = (ms) => {
      const t = ms / 1000
      const w = c.width, h = c.height, m = Math.min(w, h)
      energy += ((live.current ? 1 : 0.2) - energy) * 0.03

      // levels: real audio when available, else a soft breathing pattern
      const an = getAnalyser()
      if (an && (!freq || freq.length !== an.frequencyBinCount)) freq = new Uint8Array(an.frequencyBinCount)
      if (an) an.getByteFrequencyData(freq)
      const breath = 0.5 + 0.5 * Math.sin(t * Math.PI * 1.0) // ~60 bpm
      let bass = 0
      for (let i = 0; i < N; i++) {
        const target = an
          ? (freq[Math.floor((i / N) * freq.length * 0.7)] / 255) * energy
          : (0.3 + 0.5 * Math.abs(Math.sin(t * 0.9 + i * 0.22 + Math.sin(t * 0.5 + i * 0.1)))) * (0.75 + 0.25 * breath) * energy
        smooth[i] += (target - smooth[i]) * 0.12 // ease so nothing jitters
        if (i < 8) bass += smooth[i] / 8
      }

      // base: deep indigo -> plum, very slowly shifting
      const drift = Math.sin(t * 0.05) * 10
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, hsl(250 + drift, 55, 11))
      g.addColorStop(1, hsl(292 + drift, 50, 15))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      // slow glowing light
      ctx.globalCompositeOperation = 'lighter'
      for (const b of blobs) {
        const x = (b.x + Math.sin(t * b.sx * 2 + b.hue) * 0.12) * w
        const y = (b.y + Math.cos(t * b.sy * 2 + b.hue) * 0.1) * h
        const r = b.r * m * (1 + bass * 0.06)
        const rg = ctx.createRadialGradient(x, y, 0, x, y, r)
        rg.addColorStop(0, hsl(b.hue + drift, 75, 55, b.a * (0.7 + 0.3 * energy)))
        rg.addColorStop(1, hsl(b.hue + drift, 75, 55, 0))
        ctx.fillStyle = rg
        ctx.fillRect(0, 0, w, h)
      }
      ctx.globalCompositeOperation = 'source-over'

      // specks
      for (const p of specks) {
        p.y -= p.v * 0.02 * (0.4 + energy)
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random() }
        ctx.fillStyle = hsl(300, 60, 85, 0.22)
        ctx.beginPath()
        ctx.arc(p.x * w, p.y * h, m * 0.0035 * p.s, 0, Math.PI * 2)
        ctx.fill()
      }

      // soft ring of thin bars, in a narrow pink-violet range
      const cx = w / 2, cy = h * 0.36, r0 = m * 0.17
      ctx.lineCap = 'round'
      ctx.lineWidth = Math.max(2, m * 0.006)
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 - Math.PI / 2 + t * 0.03
        const len = m * (0.012 + smooth[i] * 0.09)
        const hue = 270 + 60 * (0.5 + 0.5 * Math.sin(a * 2 + t * 0.2)) // 270-330
        ctx.strokeStyle = hsl(hue, 70, 72, 0.55 + 0.25 * smooth[i])
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0)
        ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len))
        ctx.stroke()
      }
      // hairline ring + gentle glow in the middle
      ctx.strokeStyle = hsl(300, 60, 80, 0.2)
      ctx.lineWidth = Math.max(1, m * 0.002)
      ctx.beginPath()
      ctx.arc(cx, cy, r0 * 0.94, 0, Math.PI * 2)
      ctx.stroke()
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r0 * 0.9)
      core.addColorStop(0, hsl(310, 70, 80, 0.28 + bass * 0.12))
      core.addColorStop(1, hsl(280, 70, 60, 0))
      ctx.fillStyle = core
      ctx.beginPath()
      ctx.arc(cx, cy, r0 * (0.92 + bass * 0.05), 0, Math.PI * 2)
      ctx.fill()

      // vignette keeps the edges dark and the lyrics readable
      const v = ctx.createRadialGradient(w / 2, h / 2, m * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75)
      v.addColorStop(0, 'rgba(0,0,0,0)')
      v.addColorStop(1, 'rgba(0,0,0,0.45)')
      ctx.fillStyle = v
      ctx.fillRect(0, 0, w, h)

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])

  return <canvas ref={canvas} className="absolute inset-0 w-full h-full" />
}

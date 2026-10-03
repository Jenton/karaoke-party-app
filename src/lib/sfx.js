// Sound effects synthesised with the Web Audio API - no audio files to download.
let ctx
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function noiseBuffer(c, seconds) {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return buf
}

export function applause() {
  const c = ac()
  const t0 = c.currentTime
  const dur = 3.5
  const master = c.createGain()
  master.gain.setValueAtTime(0, t0)
  master.gain.linearRampToValueAtTime(0.9, t0 + 0.4)
  master.gain.setValueAtTime(0.9, t0 + dur - 1.2)
  master.gain.linearRampToValueAtTime(0, t0 + dur)
  master.connect(c.destination)
  // lots of tiny "claps": short noise bursts at random times
  for (let i = 0; i < 90; i++) {
    const src = c.createBufferSource()
    src.buffer = noiseBuffer(c, 0.06)
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1200 + Math.random() * 2800
    bp.Q.value = 0.8
    const g = c.createGain()
    const t = t0 + Math.random() * (dur - 0.1)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.5 + Math.random() * 0.5, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06)
    src.connect(bp).connect(g).connect(master)
    src.start(t)
  }
}

export function cheer() {
  const c = ac()
  const t0 = c.currentTime
  const dur = 2.6
  const master = c.createGain()
  master.gain.setValueAtTime(0, t0)
  master.gain.linearRampToValueAtTime(0.7, t0 + 0.25)
  master.gain.linearRampToValueAtTime(0, t0 + dur)
  master.connect(c.destination)
  // a crowd of "voices": detuned sawtooth through vowel-ish formant filters, with noise
  for (let i = 0; i < 14; i++) {
    const o = c.createOscillator()
    o.type = 'sawtooth'
    const base = 180 + Math.random() * 280
    o.frequency.setValueAtTime(base, t0)
    o.frequency.linearRampToValueAtTime(base * (1.2 + Math.random() * 0.3), t0 + dur * 0.6)
    const f = c.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 700 + Math.random() * 900
    f.Q.value = 2
    const g = c.createGain()
    g.gain.value = 0.12
    o.connect(f).connect(g).connect(master)
    o.start(t0)
    o.stop(t0 + dur)
  }
  const n = c.createBufferSource()
  n.buffer = noiseBuffer(c, dur)
  const nf = c.createBiquadFilter()
  nf.type = 'bandpass'
  nf.frequency.value = 2500
  const ng = c.createGain()
  ng.gain.value = 0.25
  n.connect(nf).connect(ng).connect(master)
  n.start(t0)
}

export function airHorn() {
  const c = ac()
  const t0 = c.currentTime
  const master = c.createGain()
  master.gain.setValueAtTime(0.0001, t0)
  master.gain.exponentialRampToValueAtTime(0.6, t0 + 0.02)
  master.gain.setValueAtTime(0.6, t0 + 0.9)
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1)
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 3200
  lp.connect(master).connect(c.destination)
  ;[415, 523, 622].forEach((freq) => {
    ;[-6, 6].forEach((detune) => {
      const o = c.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = freq
      o.detune.value = detune
      o.connect(lp)
      o.start(t0)
      o.stop(t0 + 1.15)
    })
  })
}

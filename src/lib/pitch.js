// Pitch engine.
//
// Browsers do not let a page tap into the audio of a cross-origin YouTube iframe, so the song plays in a
// separate pop-out window (see lib/popout.js). We ask the browser to share THAT tab's audio
// (getDisplayMedia), which mutes it locally, and play the captured stream back through Signalsmith Stretch
// (a high quality pitch shifter running as WASM in an AudioWorklet). The key changes by N semitones while
// the song speed stays the same.
// Works in Chrome / Edge (desktop).
import SignalsmithStretch from 'signalsmith-stretch'

let ctx = null
let stream = null
let source = null
let stretch = null
let analyser = null
let semis = 0

// Sound presets: a longer block copes better with dense music and big shifts (less chorus-like blur) but adds
// delay; a lower tonality limit tames the metallic top end; formant compensation suits solo voices more than a full mix.
export const QUALITY = {
  smooth: { label: 'Smoother', hint: 'best for big shifts, a bit more delay', blockMs: 240, intervalMs: 60, tonalityHz: 6000, formantCompensation: false },
  balanced: { label: 'Balanced', blockMs: 120, intervalMs: 30, tonalityHz: 8000, formantCompensation: true },
  sharp: { label: 'Sharper', hint: 'least delay, can sound metallic', blockMs: 80, intervalMs: 20, tonalityHz: 12000, formantCompensation: true },
}
const QKEY = 'karaoke-pitch-quality'
let quality = (() => { try { const q = localStorage.getItem(QKEY); return QUALITY[q] ? q : 'smooth' } catch { return 'smooth' } })()
export const getQuality = () => quality

function applyQuality() {
  if (!stretch) return
  const q = QUALITY[quality]
  stretch.configure({ blockMs: q.blockMs, intervalMs: q.intervalMs })
  stretch.schedule({ active: true, semitones: semis, tonalityHz: q.tonalityHz, formantCompensation: q.formantCompensation })
}
export function setQuality(name) {
  if (!QUALITY[name]) return
  quality = name
  try { localStorage.setItem(QKEY, name) } catch { /* ignore */ }
  applyQuality()
}
const listeners = new Set()
const notify = () => listeners.forEach((f) => f())
// subscribe to the engine turning on / off (returns an unsubscribe function)
export const onEngineChange = (f) => { listeners.add(f); return () => listeners.delete(f) }

export const isPitchEngineSupported = () =>
  !!navigator.mediaDevices?.getDisplayMedia && /Chrome|Edg/.test(navigator.userAgent)

export const isPitchEngineOn = () => !!stream

export async function startPitchEngine(onStopped) {
  ctx = new AudioContext({ latencyHint: 'interactive' })
  await ctx.resume()
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: true, // required by the API; we never display it
      audio: { suppressLocalAudioPlayback: true, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      preferCurrentTab: false,
      selfBrowserSurface: 'exclude',
      systemAudio: 'exclude',
    })
    if (stream.getAudioTracks().length === 0) throw new Error('NO_AUDIO')
    stretch = await SignalsmithStretch(ctx)
    source = ctx.createMediaStreamSource(stream)
    source.connect(stretch)
    stretch.connect(ctx.destination)
    applyQuality()
    // a side tap so the visualizer can react to the music while the key changer is on
    analyser = ctx.createAnalyser()
    analyser.fftSize = 128
    analyser.smoothingTimeConstant = 0.8
    source.connect(analyser)
  } catch (e) {
    stopPitchEngine()
    throw e
  }
  // User clicked the browser's own "Stop sharing" button
  stream.getTracks().forEach((t) =>
    t.addEventListener('ended', () => {
      stopPitchEngine()
      onStopped?.()
    }),
  )
  notify()
}

// AnalyserNode for the captured audio (null unless the key changer is on)
export const getAnalyser = () => analyser

export function setSemitones(n) {
  semis = n
  stretch?.schedule({ semitones: n })
}

export function stopPitchEngine() {
  const was = !!stream
  stream?.getTracks().forEach((t) => t.stop())
  source?.disconnect()
  stretch?.disconnect()
  analyser?.disconnect()
  ctx?.close().catch(() => {})
  stream = source = stretch = analyser = ctx = null
  if (was) notify()
}

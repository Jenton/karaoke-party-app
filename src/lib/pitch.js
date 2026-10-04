// Pitch engine.
//
// Browsers do not let a page tap into the audio of a cross-origin YouTube iframe,
// so we cannot route the player straight into the Web Audio graph. Instead we ask
// the browser to share THIS TAB's audio (getDisplayMedia), mute the tab's normal
// output, and play the captured stream back through a Web Audio pitch shifter.
// Result: the key changes by N semitones while the song speed stays the same.
// Works in Chrome / Edge (desktop). Everything the tab plays (including sound
// effects) goes through the shifter - that's expected.
import * as Tone from 'tone'

let stream = null
let source = null
let shifter = null
let analyser = null
const listeners = new Set()
const notify = () => listeners.forEach((f) => f())
// subscribe to the engine turning on / off (returns an unsubscribe function)
export const onEngineChange = (f) => { listeners.add(f); return () => listeners.delete(f) }

export const isPitchEngineSupported = () =>
  !!navigator.mediaDevices?.getDisplayMedia && /Chrome|Edg/.test(navigator.userAgent)

export const isPitchEngineOn = () => !!stream

// The song must play in ANOTHER tab/window (the pop-out player): if this page captured its own output the
// shifted sound would be fed back into itself (a loud screech). The pop-out tab is muted locally while captured.
export async function startPitchEngine(onStopped) {
  await Tone.start()
  stream = await navigator.mediaDevices.getDisplayMedia({
    video: true, // required by the API; we never display it
    audio: { suppressLocalAudioPlayback: true, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    preferCurrentTab: false,
    selfBrowserSurface: 'exclude',
    systemAudio: 'exclude',
  })
  if (stream.getAudioTracks().length === 0) {
    stopPitchEngine()
    throw new Error('NO_AUDIO')
  }
  await Tone.getContext().rawContext.resume?.()
  shifter = new Tone.PitchShift({ pitch: 0, windowSize: 0.1, delayTime: 0, feedback: 0 }).toDestination()
  source = Tone.getContext().rawContext.createMediaStreamSource(stream)
  Tone.connect(source, shifter)
  // a side tap so the visualizer can react to the music while the key changer is on
  analyser = Tone.getContext().rawContext.createAnalyser()
  analyser.fftSize = 128
  analyser.smoothingTimeConstant = 0.8
  source.connect(analyser)
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
  if (shifter) shifter.pitch = n
}

export function stopPitchEngine() {
  stream?.getTracks().forEach((t) => t.stop())
  source?.disconnect()
  shifter?.dispose()
  analyser?.disconnect()
  stream = source = shifter = analyser = null
  notify()
}

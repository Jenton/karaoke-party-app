import { useEffect, useState } from 'react'
import { isPitchEngineOn, isPitchEngineSupported, onEngineChange, startPitchEngine, stopPitchEngine, setSemitones } from '../lib/pitch.js'
import { closePopout, openPopout } from '../lib/popout.js'

export default function PitchControls({ semitones, onChange, onPopout }) {
  const [on, setOn] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => setSemitones(semitones), [semitones])
  useEffect(() => () => stopPitchEngine(), [])

  useEffect(() => onEngineChange(() => setOn(isPitchEngineOn())), [])

  const enable = async () => {
    setMsg('')
    // the song plays in a second window (opened right here, from the click) so its sound can be captured safely
    if (!openPopout()) return setMsg('Your browser blocked the player window. Allow pop-ups for this site and try again.')
    try {
      await startPitchEngine()
      setSemitones(semitones)
      setOn(true)
      onPopout?.(true)
    } catch (e) {
      closePopout()
      setMsg(
        e.message === 'NO_AUDIO'
          ? 'No audio was shared. Choose the "Karaoke player" tab and tick "Also share tab audio".'
          : 'Sharing was cancelled. Click the button and choose the "Karaoke player" tab + "Also share tab audio".',
      )
    }
  }
  const disable = () => {
    stopPitchEngine()
  }
  const set = (n) => onChange(Math.max(-8, Math.min(8, n)))

  return (
    <section className="card space-y-3">
      <h2 className="text-2xl font-bold text-teal-600">🎚️ Key changer</h2>
      {!isPitchEngineSupported() && (
        <p className="text-rose-600 font-semibold">Key changing needs Chrome or Edge on a computer.</p>
      )}
      {!on ? (
        <button className="big-btn w-full bg-teal-500 text-white" onClick={enable} disabled={!isPitchEngineSupported()}>
          Turn on key changer
        </button>
      ) : (
        <button className="big-btn w-full bg-slate-200" onClick={disable}>Turn off</button>
      )}
      {msg && <p className="text-rose-600">{msg}</p>}
      <div className={on ? '' : 'opacity-50 pointer-events-none'}>
        <p className="text-center text-4xl font-bold">
          {semitones > 0 ? '+' : ''}{semitones} <span className="text-lg">semitones</span>
        </p>
        <input
          type="range" min={-8} max={8} step={1} value={semitones}
          onChange={(e) => set(Number(e.target.value))}
          className="w-full h-3 accent-teal-500 my-3"
        />
        <div className="grid grid-cols-3 gap-2">
          <button className="big-btn bg-sky-400 text-white" onClick={() => set(semitones - 1)}>⬇️ Lower</button>
          <button className="big-btn bg-slate-200" onClick={() => set(0)}>Reset</button>
          <button className="big-btn bg-pink-400 text-white" onClick={() => set(semitones + 1)}>⬆️ Higher</button>
        </div>
      </div>
      <p className="text-sm text-slate-500">
        Speed stays the same. A small <b>Karaoke player</b> window opens. When Chrome asks what to share, pick the <b>Chrome Tab</b> option, choose <b>🎤 Karaoke player</b> (not this page!) and tick <b>Also share tab audio</b>. Keep that window open.
      </p>
    </section>
  )
}

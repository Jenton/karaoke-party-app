import { useEffect, useState } from 'react'
import { isPitchEngineSupported, startPitchEngine, stopPitchEngine, setSemitones } from '../lib/pitch.js'

export default function PitchControls({ semitones, onChange }) {
  const [on, setOn] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => setSemitones(semitones), [semitones])
  useEffect(() => () => stopPitchEngine(), [])

  const enable = async (compat = false) => {
    setMsg('')
    try {
      await startPitchEngine(() => setOn(false), { compat })
      setSemitones(semitones)
      setOn(true)
    } catch (e) {
      setMsg(
        e.message === 'NO_AUDIO'
          ? 'No audio was shared. Pick "This tab" and tick "Share tab audio".'
          : 'Sharing was cancelled. Click the button and choose "This tab" + "Share tab audio".',
      )
    }
  }
  const retryCompat = async () => {
    stopPitchEngine()
    setOn(false)
    await enable(true)
  }
  const disable = () => {
    stopPitchEngine()
    setOn(false)
  }
  const set = (n) => onChange(Math.max(-8, Math.min(8, n)))

  return (
    <section className="card space-y-3">
      <h2 className="text-2xl font-bold text-teal-600">🎚️ Key changer</h2>
      {!isPitchEngineSupported() && (
        <p className="text-rose-600 font-semibold">Key changing needs Chrome or Edge on a computer.</p>
      )}
      {!on ? (
        <button className="big-btn w-full bg-teal-500 text-white" onClick={() => enable()} disabled={!isPitchEngineSupported()}>
          Turn on key changer
        </button>
      ) : (
        <div className="space-y-2">
          <button className="big-btn w-full bg-slate-200" onClick={disable}>Turn off</button>
          <button className="underline text-sm text-slate-600" onClick={retryCompat}>No sound? Try compatibility mode</button>
        </div>
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
        Speed stays the same. When the browser asks, choose <b>This tab</b> and tick <b>Share tab audio</b>.
      </p>
    </section>
  )
}

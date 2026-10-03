import { applause, cheer, airHorn } from '../lib/sfx.js'
import { confettiBurst, confettiCannons } from '../lib/confetti.js'

const buttons = [
  { label: '🎉 Confetti', color: 'bg-yellow-400', run: confettiBurst },
  { label: '👏 Applause', color: 'bg-green-400', run: () => { applause(); confettiBurst() } },
  { label: '📣 Crowd cheer', color: 'bg-sky-400', run: cheer },
  { label: '📯 Air horn', color: 'bg-rose-500 text-white', run: airHorn },
  { label: '🌈 PARTY TIME', color: 'bg-fuchsia-500 text-white', run: () => { cheer(); airHorn(); confettiCannons() } },
]

export default function SoundBoard() {
  return (
    <section className="card">
      <h2 className="text-2xl font-bold text-fuchsia-600 mb-3">🔊 Celebrate!</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {buttons.map((b) => (
          <button key={b.label} onClick={b.run} className={`big-btn !text-xl !py-5 ${b.color}`}>{b.label}</button>
        ))}
      </div>
    </section>
  )
}

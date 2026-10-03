import { useState } from 'react'

const SIZES = ['text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl']

// High-contrast lyric screen for a living-room TV.
export default function Lyrics({ lyrics, onChange }) {
  const [size, setSize] = useState(3)
  const [editing, setEditing] = useState(false)

  return (
    <section className="rounded-3xl bg-black text-yellow-200 shadow-xl p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h2 className="text-xl font-bold text-white mr-auto">📜 Lyrics</h2>
        <button className="big-btn !py-1 !text-base bg-white text-black" onClick={() => setSize((s) => Math.max(0, s - 1))}>A−</button>
        <button className="big-btn !py-1 !text-base bg-white text-black" onClick={() => setSize((s) => Math.min(SIZES.length - 1, s + 1))}>A+</button>
        <button className="big-btn !py-1 !text-base bg-cyan-300 text-black" onClick={() => setEditing((e) => !e)}>
          {editing ? '✅ Done' : '✏️ Edit'}
        </button>
      </div>
      {editing ? (
        <textarea
          autoFocus
          className="w-full h-72 rounded-xl p-3 text-lg bg-slate-900 text-white border-2 border-cyan-300"
          placeholder="Paste the lyrics here..."
          value={lyrics}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className={`${SIZES[size]} font-bold leading-snug whitespace-pre-wrap max-h-[60vh] overflow-y-auto text-center`}>
          {lyrics?.trim() || <span className="text-slate-400">No lyrics yet - tap Edit and paste some! 🎵</span>}
        </div>
      )}
    </section>
  )
}

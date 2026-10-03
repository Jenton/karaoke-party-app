import EditableName from './EditableName.jsx'
import VersionToggle from './VersionToggle.jsx'
import { hasBoth } from '../lib/songs.js'

export default function Queue({ queue, onPlay, onRemove, onMoveUp, onRename, onVersion }) {
  return (
    <section className="card">
      <h2 className="text-2xl font-bold text-orange-600 mb-3">🎟️ Next up ({queue.length})</h2>
      {queue.length === 0 && <p className="text-slate-500 text-lg">Nobody in line yet - add a song!</p>}
      <ol className="space-y-2">
        {queue.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2 bg-violet-100 rounded-2xl p-3 animate-pop">
            <span className="w-9 h-9 shrink-0 rounded-full bg-violet-600 text-white grid place-items-center font-bold">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold truncate">{s.title}</p>
              <p className="text-sm text-slate-600 truncate">🎤 <EditableName value={s.singer} onSave={onRename && ((name) => onRename(s.id, name))} /></p>
            </div>
            {onVersion && hasBoth(s) && <VersionToggle size="sm" value={s.version ?? 'karaoke'} onChange={(v) => onVersion(s.id, v)} />}
            {onMoveUp && i > 0 && (
              <button aria-label="Move up" className="px-2 py-1 rounded-lg bg-white" onClick={() => onMoveUp(s.id)}>⬆️</button>
            )}
            {onPlay && (
              <button aria-label="Play now" className="px-2 py-1 rounded-lg bg-green-400" onClick={() => onPlay(s.id)}>▶️</button>
            )}
            <button aria-label="Remove" className="px-2 py-1 rounded-lg bg-rose-200" onClick={() => onRemove(s.id)}>🗑️</button>
          </li>
        ))}
      </ol>
    </section>
  )
}

import AddSongForm from './AddSongForm.jsx'
import Queue from './Queue.jsx'
import SongPicker from './SongPicker.jsx'

// Phone view: pick songs from the library (or add by link). No player.
export default function RemoteView({ state, actions, library }) {
  const queuedIds = [state.current, ...state.queue].filter(Boolean).map((s) => s.videoId)
  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-4xl font-bold text-white text-center drop-shadow">🎤 Pick a song!</h1>
      {state.current && (
        <div className="card text-center">
          <p className="text-sm text-slate-500">Now singing</p>
          <p className="text-2xl font-bold">{state.current.title}</p>
          {state.current.singer && <p>🎤 {state.current.singer}</p>}
        </div>
      )}
      <Queue queue={state.queue} onRemove={actions.remove} />
      <SongPicker library={library} queuedIds={queuedIds} onPick={actions.addFromLibrary} onQuickAdd={actions.quickAdd} />
      <details className="card">
        <summary className="cursor-pointer font-bold">Add a song by link</summary>
        <div className="mt-3"><AddSongForm onAdd={actions.add} /></div>
      </details>
    </main>
  )
}

import AddSongForm from './AddSongForm.jsx'
import Queue from './Queue.jsx'

// Phone view: add songs to the queue, no player.
export default function RemoteView({ state, actions }) {
  return (
    <main className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-4xl font-bold text-white text-center drop-shadow">🎤 Pick a song!</h1>
      {state.current && (
        <div className="card text-center">
          <p className="text-sm text-slate-500">Now singing</p>
          <p className="text-2xl font-bold">{state.current.title}</p>
          <p>🎤 {state.current.singer}</p>
        </div>
      )}
      <AddSongForm onAdd={actions.add} />
      <Queue queue={state.queue} onRemove={actions.remove} />
    </main>
  )
}

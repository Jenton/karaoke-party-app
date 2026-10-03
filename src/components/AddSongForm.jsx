import { useState } from 'react'
import { parseYouTubeId } from '../lib/youtube.js'

export default function AddSongForm({ onAdd }) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [singer, setSinger] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const videoId = parseYouTubeId(url)
    if (!videoId) return setError("Hmm, that doesn't look like a YouTube link 🤔")
    if (!title.trim()) return setError('Give the song a title!')
    onAdd({
      id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()),
      videoId,
      title: title.trim(),
      singer: singer.trim() || 'Mystery Singer',
      lyrics,
    })
    setUrl(''); setTitle(''); setSinger(''); setLyrics(''); setError('')
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="text-2xl font-bold text-violet-700">➕ Add a song</h2>
      <input className="field" placeholder="Paste YouTube link" value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" />
      <input className="field" placeholder="Song title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input className="field" placeholder="Who's singing?" value={singer} onChange={(e) => setSinger(e.target.value)} />
      <textarea className="field h-24" placeholder="Lyrics (optional - paste them here)" value={lyrics} onChange={(e) => setLyrics(e.target.value)} />
      {error && <p className="text-rose-600 font-semibold">{error}</p>}
      <button className="big-btn w-full bg-pink-500 text-white">Add to queue 🎶</button>
    </form>
  )
}

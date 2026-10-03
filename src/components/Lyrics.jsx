import { useEffect, useMemo, useRef, useState } from 'react'
import { findLyrics, parseLrc } from '../lib/lyrics.js'

// lyric size in vw so it scales with the screen (TV or laptop)
const SIZES = [1.6, 2, 2.5, 3.1, 3.8, 4.6]
const fontSize = (i) => ({ fontSize: `clamp(1.25rem, ${SIZES[i]}vw, 5.5rem)` })

// High-contrast lyric screen. With synced lyrics it highlights the current line.
export default function Lyrics({ song, getTime, onChange }) {
  const [size, setSize] = useState(2)
  const [editing, setEditing] = useState(false)
  const [matches, setMatches] = useState([])
  const [matchIdx, setMatchIdx] = useState(0)
  const [status, setStatus] = useState('')
  const [offset, setOffset] = useState(0) // seconds; + = lyrics appear later
  const [follow, setFollow] = useState(true)
  const [now, setNow] = useState(0)
  const lineRefs = useRef([])
  const getTimeRef = useRef(getTime)
  getTimeRef.current = getTime

  const lines = useMemo(() => parseLrc(song?.synced), [song?.synced])
  const useSynced = follow && lines.length > 0

  // reset per song
  useEffect(() => {
    setMatches([]); setMatchIdx(0); setStatus(''); setOffset(0); setEditing(false)
  }, [song?.id])

  // poll the video clock when following along
  useEffect(() => {
    if (!useSynced) return
    const id = setInterval(() => setNow(getTimeRef.current()), 250)
    return () => clearInterval(id)
  }, [useSynced])

  let active = -1
  if (useSynced) for (let i = 0; i < lines.length; i++) if (lines[i].t + offset <= now) active = i

  useEffect(() => {
    lineRefs.current[active]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [active])

  const apply = (m) => onChange({ lyrics: m.plain, synced: m.synced })

  const search = async () => {
    if (!song) return
    setStatus('Searching… 🔍')
    try {
      const found = await findLyrics(song.title, song.artist)
      setMatches(found)
      setMatchIdx(0)
      if (found.length) {
        apply(found[0])
        setStatus(`Found: ${found[0].label}`)
      } else setStatus('No lyrics found. Try editing the song title, or paste them yourself.')
    } catch {
      setStatus("Couldn't reach the lyrics service (is the internet on?).")
    }
  }

  const tryNext = () => {
    const i = (matchIdx + 1) % matches.length
    setMatchIdx(i)
    apply(matches[i])
    setStatus(`Match ${i + 1}/${matches.length}: ${matches[i].label}`)
  }

  // Auto-search when a song with no lyrics becomes current
  useEffect(() => {
    if (song && !song.lyrics?.trim()) search()
  }, [song?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const btn = '!py-1 !px-3 !text-sm !rounded-xl'
  return (
    <section className="rounded-3xl bg-black text-yellow-200 shadow-xl p-4 sm:p-5 flex flex-col h-full min-h-0">
      <div className="flex flex-wrap items-center gap-2 mb-3 shrink-0">
        <h2 className="text-lg font-bold text-white mr-auto">📜 Lyrics</h2>
        <button className={`big-btn ${btn} bg-white text-black`} onClick={() => setSize((s) => Math.max(0, s - 1))}>A−</button>
        <button className={`big-btn ${btn} bg-white text-black`} onClick={() => setSize((s) => Math.min(SIZES.length - 1, s + 1))}>A+</button>
        <button className={`big-btn ${btn} bg-lime-300 text-black`} disabled={!song} onClick={search}>🔍 Find lyrics</button>
        {matches.length > 1 && (
          <button className={`big-btn ${btn} bg-orange-300 text-black`} onClick={tryNext}>↻ Try another</button>
        )}
        <button className={`big-btn ${btn} bg-cyan-300 text-black`} onClick={() => setEditing((e) => !e)}>
          {editing ? '✅ Done' : '✏️ Edit'}
        </button>
      </div>

      {status && <p className="text-sm text-slate-300 mb-2 shrink-0">{status}</p>}
      {lines.length > 0 && !editing && (
        <div className="flex flex-wrap items-center gap-2 mb-3 text-white text-sm shrink-0">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} /> Follow along
          </label>
          <span className="ml-auto">Timing:</span>
          <button className="px-2 rounded bg-slate-700" onClick={() => setOffset((o) => o - 0.5)}>earlier</button>
          <span className="w-12 text-center">{offset > 0 ? '+' : ''}{offset.toFixed(1)}s</span>
          <button className="px-2 rounded bg-slate-700" onClick={() => setOffset((o) => o + 0.5)}>later</button>
        </div>
      )}

      {editing ? (
        <textarea
          autoFocus
          className="w-full flex-1 min-h-[16rem] rounded-xl p-3 text-lg bg-slate-900 text-white border-2 border-cyan-300"
          placeholder="Paste the lyrics here..."
          value={song?.lyrics ?? ''}
          onChange={(e) => onChange({ lyrics: e.target.value, synced: '' })}
        />
      ) : useSynced ? (
        <div style={fontSize(size)} className="font-bold leading-snug text-center flex-1 min-h-0 overflow-y-auto">
          <div className="h-[30%]" aria-hidden />
          {lines.map((l, i) => (
            <p
              key={i}
              ref={(el) => (lineRefs.current[i] = el)}
              className={`px-2 transition-all duration-300 ${i === active ? 'text-white my-2' : 'text-yellow-200/50'}`}
            >
              {l.text || '♪'}
            </p>
          ))}
          <div className="h-[40%]" aria-hidden />
        </div>
      ) : (
        <div style={fontSize(size)} className="font-bold leading-snug whitespace-pre-wrap flex-1 min-h-0 overflow-y-auto text-center">
          {song?.lyrics?.trim() || <span className="text-slate-400">No lyrics yet. Tap Find lyrics or Edit and paste some! 🎵</span>}
        </div>
      )}
    </section>
  )
}

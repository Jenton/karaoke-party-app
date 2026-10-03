// Controls for the lyrics shown on the stage (lives in the slide-in panel).
export default function LyricsPanel({ lyrics, onChange }) {
  const { song, lines, matches, status, timingNote, offset, setOffset, syncNow, size, setSize, follow, setFollow, search, tryNext, nativeKaraoke, setNativeKaraoke, nativeActive } = lyrics
  const btn = 'rounded-xl px-3 py-2 font-semibold disabled:opacity-40'
  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap gap-2">
        <button className={`${btn} bg-lime-300`} disabled={!song} onClick={search}>🔍 Find lyrics</button>
        {matches.length > 1 && <button className={`${btn} bg-orange-300`} onClick={tryNext}>↻ Try another</button>}
      </div>
      {status && !nativeActive && <p className="text-sm text-slate-600">{status}</p>}
      {timingNote && <p className="text-sm text-amber-700">⚠️ {timingNote}</p>}

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={nativeKaraoke} onChange={(e) => setNativeKaraoke(e.target.checked)} />
        <span>
          <b>Karaoke versions: use the video's own lyrics</b> (they're already perfectly in time). The app's lyrics, below, are then used for the original videos.
          {nativeActive && <span className="block text-violet-700">Active now: this karaoke video is showing its own lyrics.</span>}
        </span>
      </label>

      <div className="flex items-center gap-2">
        <span className="font-semibold mr-auto">Text size</span>
        <button className={`${btn} bg-slate-200`} onClick={() => setSize((s) => Math.max(0, s - 1))}>A−</button>
        <button className={`${btn} bg-slate-200`} onClick={() => setSize((s) => Math.min(4, s + 1))}>A+</button>
      </div>

      {lines.length > 0 && (
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-5 h-5" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
            Follow along (timed karaoke lines)
          </label>
          <button
            className={`${btn} w-full bg-violet-600 text-white`}
            onClick={() => syncNow()}
            title="Tap the moment the first words of the song are sung (keyboard: S)"
          >
            🎯 Sync: tap the moment the first words are sung
          </button>
          <div className="flex items-center gap-2">
            <span className="mr-auto">Fine-tune (saved for this video)</span>
            <button className={`${btn} bg-slate-200`} onClick={() => setOffset((o) => o - 0.5)}>earlier</button>
            <span className="w-14 text-center">{offset > 0 ? '+' : ''}{offset.toFixed(1)}s</span>
            <button className={`${btn} bg-slate-200`} onClick={() => setOffset((o) => o + 0.5)}>later</button>
          </div>
        </div>
      )}

      <div>
        <p className="font-semibold mb-1">Lyrics text</p>
        <textarea
          className="field h-56"
          placeholder="Paste the lyrics here…"
          disabled={!song}
          value={song?.lyrics ?? ''}
          onChange={(e) => onChange({ lyrics: e.target.value, synced: '' })}
        />
        <p className="text-xs text-slate-500 mt-1">Typing here replaces the timed lyrics with plain text that scrolls along with the song. On the stage, explicit words are always shown as [bloop].</p>
      </div>
    </section>
  )
}

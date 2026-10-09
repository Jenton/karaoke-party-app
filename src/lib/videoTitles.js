// Is each video really the song it is filed under? Asks YouTube (oEmbed) for the real title and channel of
// every video and compares them with the library entry. Runs in the browser; answers are cached.
const KEY = 'karaoke-video-info-v1'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }
const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* ignore */ } }

export const cachedInfo = () => read()

// ids -> { id: { title, author } } (only videos YouTube answered for are included)
export async function fetchInfo(ids, onProgress, { force = false } = {}) {
  const cache = force ? {} : read()
  const todo = [...new Set(ids)].filter((id) => !cache[id])
  let done = 0
  const queue = [...todo]
  const worker = async () => {
    while (queue.length) {
      const id = queue.shift()
      try {
        const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}`)
        if (r.ok) {
          const d = await r.json()
          cache[id] = { title: d.title || '', author: d.author_name || '' }
        }
      } catch { /* offline or blocked: leave it unknown */ }
      onProgress?.(++done, todo.length)
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
  write(cache)
  return cache
}

const norm = (t) => (t || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const stripNotes = (t) => (t || '').replace(/[([].*?[)\]]/g, ' ')
const artistWords = (a) => norm(stripNotes(a).replace(/\boriginally\b.*$/i, '')).split(' ').filter((w) => w.length > 2 && !['the', 'and', 'kids', 'kidz', 'bop', 'feat'].includes(w))

// null when it looks right, otherwise a short reason
export function titleProblem(song, kind, info) {
  if (!info) return null
  const raw = (info.title || '').toLowerCase()
  const t = norm(info.title)
  const wanted = norm(stripNotes(song.title))
  if (wanted && !t.includes(wanted)) return "the video title doesn't mention this song"
  const karaokeish = /karaoke|instrumental|backing track|sing along|sing-along|in the style of/.test(raw) || /karaoke|sing king|sing2|easy karaoke|party tyme|zoom/.test((info.author || '').toLowerCase())
  if (kind === 'karaoke') {
    if (!karaokeish) return "it doesn't look like a karaoke video"
    return null
  }
  if (/karaoke|instrumental|backing track|cover|remix|\blive\b|reaction|slowed|sped up|8d|nightcore|tutorial|acoustic|piano/.test(raw)) return 'it looks like a cover, remix, live or karaoke video'
  const words = artistWords(song.artist)
  if (words.length && !words.some((w) => t.includes(w) || norm(info.author).includes(w))) return `neither the title nor the channel mentions ${song.artist}`
  return null
}

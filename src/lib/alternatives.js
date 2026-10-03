// Look for another embeddable upload of a song when the current one can't be played here.
// Needs the laptop version with a YouTube API key (the search is done by the local server).
const norm = (t) => (t || '').toLowerCase().replace(/[([].*?[)\]]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()
const artistName = (a) => (a || '').replace(/\(.*?\)/g, '').trim()

export const searchQuery = (song, kind) =>
  `${song.title} ${artistName(song.artist)} ${kind === 'karaoke' ? 'karaoke version' : 'official audio'}`.trim()

// does a search result look like the right song and the right kind of video?
export function looksRight(song, kind, resultTitle) {
  const raw = (resultTitle || '').toLowerCase()
  if (!norm(resultTitle).includes(norm(song.title))) return false
  const isKaraoke = /karaoke|instrumental|backing/.test(raw)
  if (kind === 'karaoke') return isKaraoke
  return !isKaraoke && !/cover|remix|\blive\b|reaction|slowed|sped up|8d|nightcore|tutorial/.test(raw)
}

export async function findAlternatives(song, kind) {
  const r = await fetch('/api/youtube/search?q=' + encodeURIComponent(searchQuery(song, kind)))
  const data = await r.json()
  if (!r.ok) throw new Error(data.error || 'Search failed')
  return data.map((v) => ({ ...v, good: looksRight(song, kind, v.title) }))
}

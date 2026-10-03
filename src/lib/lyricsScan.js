import { findLyrics, lyricsArtist } from './lyrics.js'
import { findExplicit } from './profanity.js'

// Look up each song's lyrics and note explicit words, so the host can see which songs are risky.
//   status: 'clean' | 'mild' (e.g. "damn") | 'strong' | 'none' (no lyrics found) | 'unknown' (couldn't tell)
const KEY = 'karaoke-lyrics-scan-v1'
const TTL = 7 * 24 * 3600e3

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} }
}
const write = (m) => {
  try { localStorage.setItem(KEY, JSON.stringify(m)) } catch { /* ignore */ }
}

export const cachedScan = () => Object.fromEntries(Object.entries(read()).map(([id, v]) => [id, v]))

async function scanSong(song) {
  if (!lyricsArtist(song.artist)) return { s: 'unknown', words: [] }
  try {
    const { matches } = await findLyrics(song.title, song.artist)
    if (!matches.length) return { s: 'none', words: [] }
    const { strong, mild } = findExplicit(matches[0].plain)
    return { s: strong.length ? 'strong' : mild.length ? 'mild' : 'clean', words: [...strong, ...mild] }
  } catch {
    return { s: 'unknown', words: [] }
  }
}

// scan songs we have no fresh result for (all of them with force); calls onResult(map) as it goes
export async function scanLibrary(songs, { force = false, onResult } = {}) {
  const m = read()
  const now = Date.now()
  const todo = songs.filter((s) => force || !m[s.videoId] || now - m[s.videoId].t > TTL)
  for (let i = 0; i < todo.length; i += 4) {
    const batch = todo.slice(i, i + 4)
    const res = await Promise.all(batch.map(scanSong))
    batch.forEach((s, k) => { m[s.videoId] = { ...res[k], t: now } })
    write(m)
    onResult?.({ ...m })
  }
  return m
}

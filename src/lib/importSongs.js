import { parseYouTubeId } from './youtube.js'

// Turn a pasted JSON song list into library songs. Accepts:
//  - this app's own format: { title, artist?, genre?, karaokeId?, officialId? }
//  - flat lists with one video per row, e.g. { id: "1-off" | "1-kar", title, artist, genre, youtubeId }
//    (rows for the same title + artist are merged into one song with two versions)
const norm = (t) => (t || '').toLowerCase().replace(/[([].*?[)\]]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()
const SUFFIX = /\s*[([]\s*(official\s*(music\s*)?(video|audio|lyric(s)?\s*video|clip)|original\s*video|karaoke(\s*version)?|lyric\s*video|audio)\s*[)\]]\s*$/i

export function parseSongList(text) {
  let rows
  try {
    rows = JSON.parse(text)
  } catch {
    return { songs: [], skipped: 0, error: "That isn't valid JSON." }
  }
  if (!Array.isArray(rows)) rows = rows?.songs
  if (!Array.isArray(rows)) return { songs: [], skipped: 0, error: 'Expected a list (an array) of songs.' }

  const byKey = new Map()
  let skipped = 0
  for (const r of rows) {
    const title = String(r?.title ?? '').trim()
    let karaokeId = parseYouTubeId(r?.karaokeId || '')
    let officialId = parseYouTubeId(r?.officialId || '')
    const flat = parseYouTubeId(r?.youtubeId || r?.videoId || r?.url || '')
    if (flat && !karaokeId && !officialId) {
      const isKaraoke = /[-_]kar(aoke)?$/i.test(String(r?.id ?? '')) || /karaoke/i.test(`${r?.title ?? ''} ${r?.genre ?? ''}`)
      if (isKaraoke) karaokeId = flat
      else officialId = flat
    }
    if (!title || (!karaokeId && !officialId)) { skipped++; continue }
    const clean = title.replace(SUFFIX, '').trim()
    const key = `${norm(clean)}|${norm(r?.artist)}`
    const song = byKey.get(key) ?? { title: clean, artist: r?.artist ? String(r.artist) : undefined }
    if (karaokeId) song.karaokeId = karaokeId
    if (officialId) song.officialId = officialId
    const genre = r?.genre && !/^karaoke$/i.test(r.genre) ? String(r.genre) : undefined
    if (genre && !song.genre) song.genre = genre
    byKey.set(key, song)
  }
  const songs = [...byKey.values()].map((s) => ({ ...s, videoId: s.officialId || s.karaokeId, ...(s.genre ? {} : s.officialId ? {} : { genre: 'Karaoke' }) }))
  return { songs, skipped, error: '' }
}

// add new songs to the library; a song that already exists (same title + artist, or a shared video) gets its missing version filled in
export function mergeSongs(library, incoming) {
  const out = library.map((s) => ({ ...s }))
  let added = 0
  let updated = 0
  for (const inc of incoming) {
    const ids = [inc.karaokeId, inc.officialId, inc.videoId].filter(Boolean)
    const hit = out.find(
      (s) => ids.some((id) => [s.videoId, s.karaokeId, s.officialId].includes(id)) || (norm(s.title) === norm(inc.title) && norm(s.artist) === norm(inc.artist)),
    )
    if (!hit) { out.push(inc); added++; continue }
    let changed = false
    for (const f of ['karaokeId', 'officialId', 'artist', 'genre']) if (inc[f] && !hit[f]) { hit[f] = inc[f]; changed = true }
    if (changed) updated++
  }
  return { library: out, added, updated }
}

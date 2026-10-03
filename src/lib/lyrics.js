import { HAS_SERVER } from './env.js'

// Auto lyrics lookup via LRCLIB (through the local server's /api/lyrics proxy when there is one).

// "Let It Go (Karaoke Version) - Kidz Bop" -> "Let It Go"
export function cleanTitle(title) {
  return title
    .replace(/[([{].*?[)\]}]/g, ' ')
    .replace(/\b(kidz\s*bop|karaoke|instrumental|version|lyrics|official|video|with lyrics|backing track|sing along)\b/gi, ' ')
    .replace(/\s[-–|]\s.*$/, '') // drop " - artist" suffix
    .replace(/\s+/g, ' ')
    .trim()
}

// Returns a list of candidates: { label, plain, synced }
export async function findLyrics(title, artist) {
  // KIDZ BOP covers aren't in lyrics databases under that name, so only real artists help the search
  const useArtist = artist && !/kidz\s*bop/i.test(artist)
  const q = [cleanTitle(title) || title, useArtist ? artist.replace(/\(.*?\)/g, '').trim() : ''].filter(Boolean).join(' ')
  const r = await fetch(
    (HAS_SERVER ? '/api/lyrics?q=' : 'https://lrclib.net/api/search?q=') + encodeURIComponent(q),
  )
  if (!r.ok) throw new Error('lookup failed')
  const list = await r.json()
  return list
    .filter((x) => !x.instrumental && (x.plainLyrics || x.syncedLyrics))
    .sort((a, b) => !!b.syncedLyrics - !!a.syncedLyrics) // prefer follow-along lyrics
    .slice(0, 8)
    .map((x) => ({
      label: `${x.trackName} - ${x.artistName}`,
      plain: x.plainLyrics || stripTimes(x.syncedLyrics),
      synced: x.syncedLyrics || '',
    }))
}

const stripTimes = (lrc) => lrc.replace(/\[[^\]]*\]\s*/g, '')

// "[01:23.45] some words" -> [{ t: 83.45, text: 'some words' }]
export function parseLrc(lrc) {
  if (!lrc) return []
  return lrc
    .split('\n')
    .map((line) => {
      const m = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/)
      return m ? { t: Number(m[1]) * 60 + Number(m[2]), text: m[3] } : null
    })
    .filter(Boolean)
}

import { HAS_SERVER } from './env.js'
import { isExplicit } from './profanity.js'

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

const norm = (t) =>
  (t || '')
    .toLowerCase()
    .replace(/[([{].*?[)\]}]/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
const artistTokens = (a) =>
  norm(a)
    .split(' ')
    .filter((w) => w.length > 2 && !['feat', 'and', 'the', 'ft'].includes(w))

// A usable artist for matching (KIDZ BOP covers have no meaningful artist in lyrics databases)
export const lyricsArtist = (artist) => (artist && !/kidz\s*bop/i.test(artist) ? artist : '')

// Returns { matches, masked }: candidates { label, plain, synced } that match the song's title (and artist).
// Cleaner versions are listed first; `masked` says whether the first match has explicit words (shown as [bloop]).
export async function findLyrics(title, artist) {
  const who = lyricsArtist(artist)
  const cleaned = cleanTitle(title) || title
  const q = [cleaned, who.replace(/\(.*?\)/g, '').trim()].filter(Boolean).join(' ')
  const r = await fetch(
    (HAS_SERVER ? '/api/lyrics?q=' : 'https://lrclib.net/api/search?q=') + encodeURIComponent(q),
  )
  if (!r.ok) throw new Error('lookup failed')
  const list = await r.json()
  const wantTitle = norm(cleaned)
  const wantArtist = artistTokens(who)

  const explicit = (x) => isExplicit(x.plainLyrics || x.syncedLyrics)
  const matches = list
    .filter((x) => !x.instrumental && (x.plainLyrics || x.syncedLyrics))
    // must really be this song, not just a similar title
    .filter((x) => norm(x.trackName) === wantTitle)
    .filter((x) => !wantArtist.length || artistTokens(x.artistName).some((t) => wantArtist.includes(t)))
    // clean versions first, then ones with follow-along timing
    .sort((a, b) => explicit(a) - explicit(b) || !!b.syncedLyrics - !!a.syncedLyrics)
    .slice(0, 8)
  return {
    masked: matches.length > 0 && explicit(matches[0]),
    matches: matches.map((x) => ({
      label: `${x.trackName} - ${x.artistName}`,
      duration: x.duration || 0, // seconds, lets us pick the lyrics that match the video's length
      plain: x.plainLyrics || stripTimes(x.syncedLyrics),
      synced: x.syncedLyrics || '',
    })),
  }
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

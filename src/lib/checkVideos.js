import { HAS_SERVER } from './env.js'

// Which of these YouTube videos can actually be played inside this app?
// Returns { [id]: 'ok' | 'blocked' | 'missing' | 'unknown' }.
export async function checkVideos(ids) {
  const unique = [...new Set(ids)]
  if (HAS_SERVER) {
    try {
      const r = await fetch('/api/youtube/check?ids=' + unique.join(','))
      if (r.ok) return await r.json()
    } catch { /* fall through to oEmbed */ }
  }
  // no server / no API key: YouTube's oEmbed endpoint refuses videos that can't be embedded
  const out = {}
  await Promise.all(
    unique.map(async (id) => {
      try {
        const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}`)
        out[id] = r.ok ? 'ok' : r.status === 404 ? 'missing' : r.status === 401 ? 'blocked' : 'unknown'
      } catch {
        out[id] = 'unknown'
      }
    }),
  )
  return out
}

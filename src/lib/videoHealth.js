import { checkVideos } from './checkVideos.js'

// Remembers which videos can be played in this app so the app can steer around the broken ones by itself.
//   status: 'ok' | 'blocked' (embedding off) | 'missing' (removed/private) | 'unknown' (couldn't tell)
const KEY = 'karaoke-video-health-v1'
const TTL = { ok: 24 * 3600e3, blocked: 6 * 3600e3, missing: 6 * 3600e3, unknown: 10 * 60e3 }

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} }
}
const write = (m) => {
  try { localStorage.setItem(KEY, JSON.stringify(m)) } catch { /* ignore */ }
}

export const isBad = (status) => status === 'blocked' || status === 'missing'

// current known statuses ({ id: status }) for the given ids, including stale ones
export function cachedHealth(ids = null) {
  const m = read()
  const out = {}
  for (const [id, v] of Object.entries(m)) if (!ids || ids.includes(id)) out[id] = v.s
  return out
}

// check every id we don't have a fresh answer for (or all of them with force); returns the full map
export async function refreshHealth(ids, { force = false } = {}) {
  const m = read()
  const now = Date.now()
  const stale = [...new Set(ids)].filter((id) => force || !m[id] || now - m[id].t > (TTL[m[id].s] ?? TTL.unknown))
  if (stale.length) {
    const res = await checkVideos(stale)
    for (const id of stale) m[id] = { s: res[id] ?? 'unknown', t: now }
    write(m)
  }
  return cachedHealth(ids)
}

// remember a failure we just saw while playing
export function markBad(id, status = 'blocked') {
  const m = read()
  m[id] = { s: status, t: Date.now() }
  write(m)
}

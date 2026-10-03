// Tiny API that runs inside the Vite dev/preview server (no separate backend):
//   /api/state      shared queue + current song (in memory) so phones and the laptop agree
//   /api/library    the curated song list, saved to public/library.json
//   /api/lyrics     lyrics lookup proxy (LRCLIB)
//   /api/youtube/*  YouTube Data API v3 helpers; the API key stays on the server (.env)
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'

const LIBRARY_FILE = path.resolve('public/library.json')
const YT = 'https://www.googleapis.com/youtube/v3'

const lanAddresses = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address)

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch (e) {
        reject(e)
      }
    })
  })

function readLibrary() {
  try {
    return JSON.parse(fs.readFileSync(LIBRARY_FILE, 'utf8'))
  } catch {
    return []
  }
}

function sanitizeLibrary(list) {
  const seen = new Set()
  return (Array.isArray(list) ? list : [])
    .filter((s) => s && /^[\w-]{11}$/.test(s.videoId) && !seen.has(s.videoId) && seen.add(s.videoId))
    .map((s) => ({
      videoId: s.videoId,
      title: String(s.title || 'Untitled').slice(0, 120),
      ...(s.artist ? { artist: String(s.artist).slice(0, 100) } : {}),
      ...(s.genre ? { genre: String(s.genre).slice(0, 60) } : {}),
    }))
}

export function partyApi(env = {}) {
  const key = env.YOUTUBE_API_KEY
  let state = { rev: 0, queue: [], current: null }

  async function yt(endpoint, params) {
    const url = new URL(`${YT}/${endpoint}`)
    Object.entries({ ...params, key }).forEach(([k, v]) => url.searchParams.set(k, v))
    const r = await fetch(url)
    const json = await r.json()
    if (!r.ok) throw new Error(json.error?.message || 'YouTube request failed')
    return json
  }

  // ids -> [{ videoId, title }] keeping only public videos that are allowed to be embedded
  async function hydrate(ids) {
    const out = []
    for (let i = 0; i < ids.length; i += 50) {
      const json = await yt('videos', { part: 'snippet,status', id: ids.slice(i, i + 50).join(','), maxResults: 50 })
      for (const v of json.items || []) {
        if (v.status?.embeddable && v.status?.privacyStatus === 'public') {
          out.push({ videoId: v.id, title: v.snippet.title })
        }
      }
    }
    return out
  }

  const routes = {
    'GET /api/info': async () => ({ addresses: lanAddresses() }),

    'GET /api/state': async () => state,
    'POST /api/state': async (req) => {
      const next = await readBody(req)
      state = { rev: state.rev + 1, queue: next.queue ?? [], current: next.current ?? null }
      return state
    },

    'GET /api/library': async () => readLibrary(),
    'POST /api/library': async (req) => {
      const list = sanitizeLibrary(await readBody(req))
      fs.mkdirSync(path.dirname(LIBRARY_FILE), { recursive: true })
      fs.writeFileSync(LIBRARY_FILE, JSON.stringify(list, null, 2) + '\n')
      return list
    },

    'GET /api/lyrics': async (_req, q) => {
      const r = await fetch('https://lrclib.net/api/search?q=' + encodeURIComponent(q.get('q') || ''), {
        headers: { 'User-Agent': 'karaoke-party-app (personal party use)' },
      })
      const list = await r.json()
      return Array.isArray(list) ? list : []
    },

    'GET /api/youtube/status': async () => ({ enabled: !!key }),
    'GET /api/youtube/search': async (_req, q) => {
      const found = await yt('search', {
        part: 'snippet', type: 'video', videoEmbeddable: 'true', safeSearch: 'strict',
        maxResults: 25, q: q.get('q') || 'kidz bop karaoke',
      })
      return hydrate((found.items || []).map((i) => i.id.videoId))
    },
    'GET /api/youtube/playlist': async (_req, q) => {
      const raw = q.get('id') || ''
      let id = raw
      try { id = new URL(raw).searchParams.get('list') || raw } catch { /* bare id */ }
      const ids = []
      let pageToken
      for (let page = 0; page < 4; page++) { // up to 200 videos
        const json = await yt('playlistItems', { part: 'contentDetails', playlistId: id, maxResults: 50, ...(pageToken && { pageToken }) })
        ids.push(...(json.items || []).map((i) => i.contentDetails.videoId))
        pageToken = json.nextPageToken
        if (!pageToken) break
      }
      return hydrate(ids)
    },
  }

  const middleware = async (req, res, next) => {
    if (!req.url.startsWith('/api/')) return next()
    const url = new URL(req.url, 'http://x')
    const handler = routes[`${req.method} ${url.pathname}`]
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-store')
    if (!handler) {
      res.statusCode = 404
      return res.end(JSON.stringify({ error: 'not found' }))
    }
    try {
      if (url.pathname.startsWith('/api/youtube/') && url.pathname !== '/api/youtube/status' && !key) {
        throw Object.assign(new Error('No YOUTUBE_API_KEY set in .env'), { status: 400 })
      }
      res.end(JSON.stringify(await handler(req, url.searchParams)))
    } catch (e) {
      res.statusCode = e.status || 500
      res.end(JSON.stringify({ error: e.message }))
    }
  }

  return {
    name: 'party-api',
    configureServer(s) { s.middlewares.use(middleware) },
    configurePreviewServer(s) { s.middlewares.use(middleware) },
  }
}

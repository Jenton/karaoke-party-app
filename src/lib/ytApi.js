import { HAS_SERVER } from './env.js'

// YouTube search / playlist helpers.
//  - laptop version: the local server does the work and keeps YOUTUBE_API_KEY secret
//  - public (Pages) version: call YouTube directly with VITE_YOUTUBE_API_KEY, which is baked into the
//    page and therefore public: restrict it to your site's address in Google Cloud (see README)
const KEY = import.meta.env.VITE_YOUTUBE_API_KEY
const YT = 'https://www.googleapis.com/youtube/v3'

export const hasDirectKey = !!KEY

async function yt(endpoint, params) {
  const url = new URL(`${YT}/${endpoint}`)
  Object.entries({ ...params, key: KEY }).forEach(([k, v]) => url.searchParams.set(k, v))
  const r = await fetch(url)
  const json = await r.json()
  if (!r.ok) throw new Error(json.error?.message || 'YouTube request failed')
  return json
}

// ids -> [{ videoId, title }] keeping only public videos that may be embedded
async function hydrate(ids) {
  const out = []
  for (let i = 0; i < ids.length; i += 50) {
    const json = await yt('videos', { part: 'snippet,status', id: ids.slice(i, i + 50).join(','), maxResults: 50 })
    for (const v of json.items || []) {
      if (v.status?.embeddable && v.status?.privacyStatus === 'public') out.push({ videoId: v.id, title: v.snippet.title })
    }
  }
  return out
}

async function server(path) {
  const r = await fetch(path)
  const data = await r.json()
  if (!r.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

// can we search YouTube from here?
export async function ytEnabled() {
  if (HAS_SERVER) {
    try {
      return (await server('/api/youtube/status')).enabled || hasDirectKey
    } catch { /* no server running */ }
  }
  return hasDirectKey
}

const useServer = async () => HAS_SERVER && !hasDirectKey

export async function ytSearch(q) {
  if (await useServer()) return server('/api/youtube/search?q=' + encodeURIComponent(q))
  if (!hasDirectKey) throw new Error('No YouTube API key set up')
  const found = await yt('search', { part: 'snippet', type: 'video', videoEmbeddable: 'true', safeSearch: 'strict', maxResults: 25, q: q || 'kidz bop karaoke' })
  return hydrate((found.items || []).map((i) => i.id.videoId))
}

export async function ytPlaylist(raw) {
  if (await useServer()) return server('/api/youtube/playlist?id=' + encodeURIComponent(raw))
  if (!hasDirectKey) throw new Error('No YouTube API key set up')
  let id = raw
  try { id = new URL(raw).searchParams.get('list') || raw } catch { /* bare id */ }
  const ids = []
  let pageToken
  for (let page = 0; page < 4; page++) {
    const json = await yt('playlistItems', { part: 'contentDetails', playlistId: id, maxResults: 50, ...(pageToken && { pageToken }) })
    ids.push(...(json.items || []).map((i) => i.contentDetails.videoId))
    pageToken = json.nextPageToken
    if (!pageToken) break
  }
  return hydrate(ids)
}

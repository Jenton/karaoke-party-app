// Pull the 11-character video id out of any common YouTube URL (or a bare id).
export function parseYouTubeId(input) {
  if (!input) return null
  const text = input.trim()
  if (/^[\w-]{11}$/.test(text)) return text
  try {
    const url = new URL(text)
    if (url.hostname === 'youtu.be') return url.pathname.slice(1, 12) || null
    if (url.hostname.endsWith('youtube.com')) {
      if (url.searchParams.get('v')) return url.searchParams.get('v')
      const m = url.pathname.match(/\/(embed|shorts|live|v)\/([\w-]{11})/)
      if (m) return m[2]
    }
  } catch {
    /* not a URL */
  }
  return null
}

let apiPromise
export function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prev?.()
        resolve(window.YT)
      }
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    })
  }
  return apiPromise
}

// "KIDZ BOP Kids - Flowers (Karaoke Version) [Lyrics]" -> "Flowers"
export function displayTitle(raw) {
  const t = raw
    .replace(/[([{].*?[)\]}]/g, ' ')
    .replace(/\b(kidz\s*bop(\s*kids)?|karaoke|instrumental|version|official|video|lyrics|audio|sing[\s-]?along|with)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–|:]+|[\s\-–|:]+$/g, '')
  return t || raw
}

// Quick-pick singer names. Kept only for this browser session (sessionStorage), so a new
// party starts with a clean slate; nothing is written to the song database.
const KEY = 'karaoke-singers'
const EVENT = 'singers-changed'

export function getSingers() {
  try { return JSON.parse(sessionStorage.getItem(KEY)) || [] } catch { return [] }
}

function save(list) {
  try { sessionStorage.setItem(KEY, JSON.stringify(list)) } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT))
}

export const addSinger = (name) => save([name, ...getSingers().filter((n) => n !== name)].slice(0, 16))
export const removeSinger = (name) => save(getSingers().filter((n) => n !== name))
export const clearSingers = () => save([])

// subscribe to changes (from this tab); returns an unsubscribe function
export function onSingersChange(fn) {
  window.addEventListener(EVENT, fn)
  return () => window.removeEventListener(EVENT, fn)
}

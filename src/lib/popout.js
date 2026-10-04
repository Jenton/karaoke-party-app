// The key changer needs the song to play in a separate window: that window's audio is captured, shifted,
// and played by the main page. The two pages talk over a BroadcastChannel.
const CHANNEL = 'karaoke-player-v1'
let win = null

export const openChannel = () => new BroadcastChannel(CHANNEL)

// must be called straight from a click (browsers block pop-ups otherwise)
export function openPopout() {
  win = window.open(new URL('?player=1', window.location.href).href, 'karaoke-player', 'popup,width=520,height=360')
  return win
}
export const popoutOpen = () => !!win && !win.closed
export function closePopout() {
  try { win?.close() } catch { /* already gone */ }
  win = null
}

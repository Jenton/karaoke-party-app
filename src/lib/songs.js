// A library song can have two videos: a karaoke version and the original/official one.
//   { videoId, title, artist?, genre?, karaokeId?, officialId? }
// `videoId` is the song's stable key in the library (the official video if there is one, else the karaoke one).

export const hasBoth = (s) => !!(s.karaokeId && s.officialId)
export const versionsOf = (s) => ({
  karaoke: s.karaokeId || (s.officialId ? null : s.videoId),
  official: s.officialId || (s.karaokeId ? null : s.videoId),
})

// Which version to use given a preference ('karaoke' | 'official'); falls back to whichever exists.
// `health` ({ id: status }) lets it steer away from videos known to be blocked or gone.
const usable = (id, health) => !!id && health?.[id] !== 'blocked' && health?.[id] !== 'missing'
export function resolveVersion(song, pref = 'karaoke', health = null) {
  const v = versionsOf(song)
  const other = pref === 'karaoke' ? 'official' : 'karaoke'
  let version = v[pref] ? pref : other
  if (v[pref] && v[other] && !usable(v[pref], health) && usable(v[other], health)) version = other
  return { version, videoId: v[version] ?? song.videoId }
}
// does at least one of the song's videos work?
export function isPlayable(song, health) {
  const v = versionsOf(song)
  return [v.karaoke, v.official].some((id) => usable(id, health))
}
// { karaoke: bool, official: bool }: which versions are known to work
export function versionUsable(song, health) {
  const v = versionsOf(song)
  return { karaoke: usable(v.karaoke, health), official: usable(v.official, health) }
}

export const otherVersion = (version) => (version === 'karaoke' ? 'official' : 'karaoke')
export const versionLabel = (version) => (version === 'karaoke' ? '🎤 Karaoke' : '🎬 Original')

// A library song can have two videos: a karaoke version and the original/official one.
//   { videoId, title, artist?, genre?, karaokeId?, officialId? }
// `videoId` is the song's stable key in the library (the official video if there is one, else the karaoke one).

export const hasBoth = (s) => !!(s.karaokeId && s.officialId)
export const versionsOf = (s) => ({
  karaoke: s.karaokeId || (s.officialId ? null : s.videoId),
  official: s.officialId || (s.karaokeId ? null : s.videoId),
})

// Which version to use given a preference ('karaoke' | 'official'); falls back to whichever exists.
export function resolveVersion(song, pref = 'karaoke') {
  const v = versionsOf(song)
  const version = v[pref] ? pref : pref === 'karaoke' ? 'official' : 'karaoke'
  return { version, videoId: v[version] ?? song.videoId }
}

export const otherVersion = (version) => (version === 'karaoke' ? 'official' : 'karaoke')
export const versionLabel = (version) => (version === 'karaoke' ? '🎤 Karaoke' : '🎬 Original')

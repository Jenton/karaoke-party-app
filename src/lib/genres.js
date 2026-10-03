// Broad categories used by the song filter chips. Songs can carry any free-text genre
// ("Upbeat Pop", "Disney / Animation", ...); this folds them into a handful of friendly groups.
export const GROUPS = ['Karaoke', 'Disney & Movies', 'Dance', 'Feel-good', 'Sing-alongs', 'Throwbacks', 'Fun & Novelty', 'Pop', 'KIDZ BOP']

export function genreGroup(genre) {
  const g = (genre || '').toLowerCase()
  if (!g) return 'Other'
  if (GROUPS.some((x) => x.toLowerCase() === g)) return GROUPS.find((x) => x.toLowerCase() === g)
  if (/karaoke/.test(g)) return 'Karaoke'
  if (/kidz/.test(g)) return 'KIDZ BOP'
  if (/disney|movie|animation|shrek|soundtrack/.test(g)) return 'Disney & Movies'
  if (/dance|funk|k-pop/.test(g)) return 'Dance'
  if (/retro|throwback|classic/.test(g)) return 'Throwbacks'
  if (/novelty|party|comedy|gaming/.test(g)) return 'Fun & Novelty'
  if (/feel-good|upbeat/.test(g)) return 'Feel-good'
  if (/anthem|sing-along/.test(g)) return 'Sing-alongs'
  return 'Pop'
}

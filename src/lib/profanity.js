// Lyrics come from a community database with no content rating, so for a kids' party anything explicit is
// masked as [bloop] when lyrics are shown on the stage. (The text in the Lyrics panel is left untouched.)
// "strong" words also let the app hide a whole song from the kids' picker; "mild" ones (damn, hell...) are only masked.
const STRONG = [
  'fuck\\w*', 'shit\\w*', 'bitch\\w*', 'bastard\\w*', 'asshole\\w*', 'dumbass', 'dick\\w*', 'cock', 'pussy', 'pussies',
  'cunt\\w*', 'slut\\w*', 'whore\\w*', 'nigg\\w*', 'fag\\w*', 'cocaine', 'xanax', 'hoes?', 'thot',
]
const MILD = ['ass', 'asses', 'damn\\w*', 'goddamn\\w*', 'hell', 'piss\\w*', 'crap', 'tits?', 'boobs?', 'sex', 'weed']
const re = (list, flags) => new RegExp(`\\b(?:${list.join('|')})\\b`, flags)
const ALL = [...STRONG, ...MILD]
const TEST = re(ALL, 'i')
const MASK = re(ALL, 'gi')
const STRONG_G = re(STRONG, 'gi')
const MILD_G = re(MILD, 'gi')

export const BLOOP = '[bloop]'
export const isExplicit = (text) => TEST.test(text || '')
export const censor = (text) => (text || '').replace(MASK, BLOOP)

const uniq = (m) => [...new Set((m || []).map((w) => w.toLowerCase()))]
// which explicit words does this text contain?  { strong: [...], mild: [...] }
export const findExplicit = (text) => ({ strong: uniq((text || '').match(STRONG_G)), mild: uniq((text || '').match(MILD_G)) })

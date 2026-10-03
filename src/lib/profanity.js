// Lyrics come from a community database with no content rating, so for a kids' party anything explicit is
// masked as [bloop] when lyrics are shown on the stage. (The text in the Lyrics panel is left untouched.)
const WORDS = [
  'fuck\\w*', 'shit\\w*', 'bitch\\w*', 'bastard\\w*', 'asshole\\w*', 'dumbass', 'ass', 'asses', 'dick\\w*', 'cock', 'pussy', 'pussies',
  'cunt\\w*', 'slut\\w*', 'whore\\w*', 'nigg\\w*', 'fag\\w*', 'damn\\w*', 'goddamn\\w*', 'hell', 'piss\\w*', 'crap', 'tits?', 'boobs?',
  'sex', 'weed', 'cocaine', 'xanax', 'hoes?', 'thot',
]
const SOURCE = `\\b(?:${WORDS.join('|')})\\b`
const TEST = new RegExp(SOURCE, 'i')
const MASK = new RegExp(SOURCE, 'gi')

export const BLOOP = '[bloop]'
export const isExplicit = (text) => TEST.test(text || '')
export const censor = (text) => (text || '').replace(MASK, BLOOP)

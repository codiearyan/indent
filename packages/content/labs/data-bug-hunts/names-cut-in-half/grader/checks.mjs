import { checkCases, judgeTests } from '../../grading.mjs'
import { fitName, nameLength, sameName } from '../solution/src/names.js'

const TEST = 'src/names.test.js'
const TARGET = 'src/names.js'
const SHOP = { label: "the shop's names.js", source: `starter/${TARGET}` }

const NFD = (text) => text.normalize('NFD')
// Two names that look the same are the same answer, however their accents were typed.
const looksSame = (a, b) => typeof a === 'string' && a.normalize('NFC') === b.normalize('NFC')

const UNITS =
  'A string is counted and cut in UTF-16 code units, and one character a person sees can take several: a letter followed by a separate accent mark, a character outside the most common ones, a flag, an emoji with a skin tone. Split the text into the characters a person sees.'

// A cut that stopped at exactly max code units or code points, with or without joining accents.
const byUnits = (got, max) =>
  [got, got.normalize('NFC')].some((x) => x.length === max || [...x].length === max)

const fits = [
  ['A pasted name with two-mark accents fits whole', NFD('Ängsö Kammarkör'), 16],
  ['A pasted name is cut after an accent, not before it', NFD('Ängsö Kammarkör'), 14],
  ['A name with one-mark accents is cut at the right place', 'Anaïs Duvernay', 12],
  ['A character that takes two code units is kept whole', '𠮷田 Haruka', 1],
  ['A flag at the end is kept whole', 'Kör Väst 🇸🇪', 10],
  ['An emoji with a skin tone is kept whole', 'Mo 👍🏽 Singers', 4],
  ['A plain name is cut to the full width', 'Cedar Narrows Choir', 16],
  ['A name that fits comes back as it is', 'Alto', 10]
].map(([name, text, max]) => ({
  name,
  args: [text, max],
  cause: (got) =>
    typeof got !== 'string'
      ? 'fitName() should return the name as text.'
      : nameLength(got) < Math.min(max, nameLength(text)) && got === fitName(text, nameLength(got)) && !byUnits(got, max)
        ? 'The name is cut shorter than it needs to be. Keep as many characters as fit, all the way to the width.'
        : `The name is cut in the wrong place, or in the middle of a character. ${UNITS}`
}))

const lengths = [
  ['A pasted name is counted as a person counts it', NFD('Ängsö Kammarkör')],
  ['A Japanese name is counted as a person counts it', '𠮷田 Haruka'],
  ['A flag counts as one', 'Kör Väst 🇸🇪'],
  ['An emoji with a skin tone counts as one', 'Mo 👍🏽'],
  ['A plain name is counted', 'Sur Sangam Singers']
].map(([name, text]) => ({ name, args: [text], cause: `The count is off. ${UNITS}` }))

const pairs = [
  ['Two spellings of one name are the same', NFD('Ängsö Kammarkör'), 'Ängsö Kammarkör'],
  ['The same spelling is the same', 'Sur Sangam Singers', 'Sur Sangam Singers'],
  ['A name without its accent is a different name', 'Renée Aubert', 'Renee Aubert'],
  ['A name with other capitals is a different name', 'Anna Berg', 'anna berg'],
  ['Two different characters are different names', '𠮷田 Haruka', '吉田 Haruka']
].map(([name, a, b]) => ({
  name,
  args: [a, b],
  cause: (got, expected) =>
    expected
      ? 'Two spellings of the same name come out different. A letter with an accent can be typed as one character or as a plain letter followed by a mark; put both names into the same form before comparing them.'
      : 'Two different names come out the same. Only the way accents are written may differ: a missing accent, other capitals or another character make it another name.'
}))

const TICKET_VERSIONS = [
  { ...SHOP, hint: 'Use the pasted name from contacts.js: fit it on a label, count it, and compare it with the one on file.' },
  {
    label: "a version that mends only the ticket's name",
    source: 'grader/versions/ticket-only.js',
    hint: 'A test of only the name from the ticket passes beside a version that knows that one name by heart. Add another name whose accent is a separate mark: normalize("NFD") turns any accented name into one.'
  },
  {
    label: 'a version that matches two spellings of a name but still cuts and counts code units',
    source: 'grader/versions/compare-only.js',
    hint: 'That version knows the pasted name is the one on file, and still cuts and counts it wrong. Expect a name whose accents are separate marks to fit on a label whole, and to be counted the way a person counts it.'
  }
]

const NEXT_VERSIONS = [
  { ...SHOP, hint: 'Use a name with a character that takes two code units, and cut it right after that character.' },
  {
    label: 'a version that joins accents first and then still cuts code units',
    source: 'grader/versions/compose-first.js',
    hint: 'Joining accents fixes the ticket, and nothing else. A character such as 𠮷, used in some Japanese names, has no accent and still takes two code units: cut and count a name that has one.'
  }
]

const POOL = [...TICKET_VERSIONS, ...NEXT_VERSIONS]

export const checks = {
  ticket(t) {
    return judgeTests(t, {
      test: TEST,
      target: TARGET,
      block: 'the ticket',
      versions: TICKET_VERSIONS,
      pool: POOL
    })
  },

  async fix(t) {
    const run = (exportName, cases, right, same) => checkCases(t, { file: TARGET, exportName, cases, right, same })
    const cut = await run('fitName', fits, fitName, looksSame)
    if (cut.length === 1 && !cut[0].passed && /loads|finishes/.test(cut[0].name)) return cut
    return [...cut, ...(await run('nameLength', lengths, nameLength)), ...(await run('sameName', pairs, sameName))]
  },

  next(t) {
    return judgeTests(t, {
      test: TEST,
      target: TARGET,
      block: 'next door',
      versions: NEXT_VERSIONS,
      pool: POOL
    })
  }
}

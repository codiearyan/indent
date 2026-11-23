import { checkCases, judgeTests } from '../../grading.mjs'
import { catalogueOrder as right } from '../solution/src/catalogue.js'

const TEST = 'src/catalogue.test.js'
const TARGET = 'src/catalogue.js'
const SHOP = { label: "the shop's catalogueOrder()", source: `starter/${TARGET}` }

const LANGUAGE =
  'The order changes with the computer. A comparison that names no language uses the language the computer is set to, and a computer set to Swedish sorts Å, Ä, Ö and Ø after Z. Name the language the catalogue is read in.'

const cases = [
  {
    name: 'Numbers in a title sort by their value',
    args: [['Psalm 100', 'Psalm 9', 'Psalm 10', 'Psalm 1']],
    cause: 'Titles with numbers are out of order. Compared as text, "10" comes before "9" because "1" comes before "9". Ask for numbers inside text to be compared by their value.'
  },
  {
    name: 'Small letters sort with capitals',
    args: [['bach chorale', 'Anthem', 'Carol', 'amen']],
    cause: 'Titles that start with a small letter are out of place. Text compared by code unit puts every capital before every small letter. Compare the way a reader does, where capitals make no difference to the order.'
  },
  {
    name: 'An accented letter sorts with its plain letter',
    args: [['Zephyr', 'Élégie', 'Eve', 'Ezra', 'Évensong']],
    cause: 'Accented titles are out of place. By code unit an accented letter comes after Z. Compare with the rules of a language, where É sorts with E.'
  },
  {
    name: 'Letters with a stroke sort with their plain letter',
    args: [['Østby', 'Pine', 'Oak', 'Łąka', 'Mill', 'Lark']],
    cause: 'Titles that start with a letter like Ø or Ł are out of place. A table of accents, or stripping the marks off letters, misses letters that have no mark to strip. Compare with the rules of a language, which know every letter.'
  },
  {
    name: 'Swedish letters sort the English way on every computer',
    args: [['Zephyr', 'Ängel', 'Åsa', 'Ödla', 'Anna', 'Oak']],
    cause: 'Titles with Å, Ä or Ö are out of place. In English they sort with A and O. Compare with the rules of the English language, which know every letter.'
  },
  {
    name: 'The catalogue is in reading order',
    args: [['Psalm 121', 'Evening round', 'Winter carol', 'Psalm 23', 'élan of morning', 'Ave verum', 'Zephyr round', 'Psalm 9', 'monsoon song', 'Østerlandsk vise', 'Lullaby for a ferry']],
    cause: 'The catalogue is not in reading order. Look at where the numbers, the small letters and the accents land.'
  },
  {
    name: 'The list it is handed stays as it was',
    args: [['Winter carol', 'Ave verum', 'Lullaby']],
    keepsArgs: true,
    cause: 'The titles are not in reading order.'
  },
  { name: 'An empty list stays empty', args: [[]], cause: 'An empty list should give an empty list.' }
]

export const checks = {
  ticket(t) {
    return judgeTests(t, {
      test: TEST,
      target: TARGET,
      block: 'the ticket',
      versions: [
        { ...SHOP, hint: 'Give catalogueOrder() titles with numbers, small letters and accents, and expect the order a reader wants.' },
        {
          label: "a version that mends only the ticket's catalogue",
          source: 'grader/versions/ticket-only.js',
          hint: 'A test of only the catalogue from the ticket passes beside a version that knows that one list by heart. Add a list of your own.'
        }
      ]
    })
  },

  fix(t) {
    return checkCases(t, { file: TARGET, exportName: 'catalogueOrder', cases, right, partial: LANGUAGE })
  },

  next(t) {
    // A small build of Node without Swedish rules sorts the same in every language, so there
    // that version cannot be told apart and is left out.
    const swedish = Intl.Collator.supportedLocalesOf(['sv']).length > 0
    return judgeTests(t, {
      test: TEST,
      target: TARGET,
      block: 'next door',
      versions: [
        { ...SHOP, hint: 'Give catalogueOrder() titles that start with Å, Ä or Ö, and expect the English order.' },
        {
          label: 'a version that compares the way a reader does but names no language',
          source: 'grader/versions/no-language.js',
          anywhere: true,
          hint: 'That version is right on a computer set to English. On one set to Swedish it puts Å, Ä and Ö after Z. Add a title that starts with one of them, next to titles that start with A, O or Z.'
        }
      ].filter((v) => swedish || !v.anywhere)
    })
  }
}

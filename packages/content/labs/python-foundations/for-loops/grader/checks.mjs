import { aKind, cases, LINE_WORDS, lineProblem, outputCases } from '../../grading.mjs'

const FILE = 'kit_check.py'


const number = (value) => ({ type: 'int', value })
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])
const radioLines = (from, to) => {
  const out = []
  for (let n = from; n <= to; n++) out.push(`Radio ${n} checked`)
  return out
}

const notNumber = (name, otherwise) => (v) =>
  !v || v.type === 'int'
    ? otherwise
    : v.type === 'str'
      ? `${name} holds text, not a number. A name or a sum inside quotes is only text.`
      : `${name} holds ${aKind(v.type)}, not a whole number.`

/** Every pitch length, the first `first`, each `by` longer than the last. */
const pitchList = (g, n = g.pitches) => Array.from({ length: n }, (_, i) => g.first_pitch + i * g.longer_by)
const sum = (list) => list.reduce((a, b) => a + b, 0)

const letters = (label) => [...label].filter((ch) => ch !== ' ')

export const checks = {
  radios(t) {
    return outputCases(t, {
      file: FILE,
      task: 1,
      list: [3, 5, 1, 0].map((radios) => ({
        name: radios ? `${radios} ${radios === 1 ? 'radio' : 'radios'}` : 'No radios out',
        given: ({ radios })
      })),
      judge: (out, c) => {
        const n = c.given.radios
        const want = radioLines(1, n)
        const got = out.filter((line) => /^\s*radio\b/i.test(line))
        if (same(got, want)) return null
        if (n === 0) {
          return `No radios are out here, so no Radio line should print, and ${got.length} did. Build the loop on radios, so that it runs once for each radio and not at all for none.`
        }
        const near = lineProblem(got, want[0])
        if (LINE_WORDS[near]) return LINE_WORDS[near]
        if (!got.length) {
          return n === 1
            ? 'With 1 radio no Radio line prints. range stops just before the number it is given, never on it.'
            : 'None of the lines Task 1 prints starts with Radio as the task shows. Print one line per radio, inside the loop.'
        }
        if (same(got, radioLines(0, n - 1))) {
          return 'The radios are numbered from 0, and the last radio is missing. range starts at 0 unless it is given a start, and stops just before the number it is given.'
        }
        if (same(got, radioLines(1, n - 1))) {
          return 'The last radio is missing. range stops just before the number it is given, never on it.'
        }
        if (same(got, radioLines(0, n))) {
          return 'The lines start at Radio 0, and there is no radio 0. range starts at 0 unless it is given a start.'
        }
        if (got.length === n && got.every((line) => line === got[0])) {
          return "Every line shows the same number. Print the loop's own name for the number, the one between for and in: it changes on each round."
        }
        if (got.length !== n) {
          return `There should be one Radio line for each radio, ${n} here, and ${got.length} print. Build the loop on radios, not on a number typed in.`
        }
        return 'The Radio lines do not count from the first radio to the last, one line each, in order.'
      }
    })
  },

  rope(t) {
    const list = [
      ['Three pitches', ({ pitches: 3, first_pitch: 10, longer_by: 15 })],
      ['Five pitches', ({ pitches: 5, first_pitch: 15, longer_by: 5 })],
      ['One pitch', ({ pitches: 1, first_pitch: 30, longer_by: 8 })],
      ['Pitches that do not get longer', ({ pitches: 4, first_pitch: 12, longer_by: 0 })]
    ]
    return cases(t, {
      file: FILE,
      task: 2,
      name: 'total_rope',
      blocks: true,
      typed:
        'Check changed the pitches and total_rope stayed the same. Build it from pitches, first_pitch and longer_by, not from a number typed in.',
      mistakes: [
        {
          value: (g) => g.first_pitch + (g.pitches - 1) * g.longer_by,
          hint: 'total_rope holds only the last pitch. It starts again on every round of the loop: a running total starts before the loop, and each round adds to it.'
        },
        {
          value: (g) => sum(pitchList(g, g.pitches + 1)),
          hint: 'total_rope counts one pitch too many. range(n) gives n rounds, starting at 0.'
        },
        {
          value: (g) => sum(pitchList(g, g.pitches - 1)),
          hint: 'total_rope counts one pitch too few. range(n) gives n rounds, starting at 0.'
        },
        {
          value: (g) => g.first_pitch * g.pitches,
          hint: 'total_rope treats every pitch as the first one. Each pitch is longer_by metres longer than the one before, so the length has to grow on each round.'
        },
        {
          value: (g) => sum(pitchList(g, g.pitches + 1)) - g.first_pitch,
          hint: 'total_rope makes the first pitch longer before counting it. Add a pitch to the total first, then make the next one longer.'
        }
      ],
      list: list.map(([name, given]) => ({
        name,
        given,
        expected: number(sum(pitchList(given))),
        hint: notNumber(
          'total_rope',
          'total_rope is not the metres of all the pitches together. Work out the first case by hand, then compare it with what your loop adds on each round.'
        )
      }))
    })
  },

  spell(t) {
    return outputCases(t, {
      file: FILE,
      task: 3,
      list: ['Rope bag', 'Bravo kit', 'Ice axes'].map((label) => ({
        name: `Spells ${label}`,
        given: ({ stretcher_label: label })
      })),
      judge: (out, c) => {
        const label = c.given.stretcher_label
        const want = letters(label).map((ch) => ch.toUpperCase())
        if (same(out, want)) return null
        if (out.length && out.every((line) => line.trim().toLowerCase() === label.toLowerCase())) {
          return "Each line shows the whole label. Print the loop's own name for one letter, the one between for and in: it holds the next letter on each round."
        }
        if (same(out.filter((line) => line.trim() !== ''), want)) {
          return 'The spaces print too, as empty-looking lines. Skip them: print a letter only when it is not a space.'
        }
        if (same(out.map((line) => line.toUpperCase()), want)) {
          return 'The letters are right but not all in capitals. Text has a method that gives it in capitals.'
        }
        if (out.length === 1 && out[0].replace(/\s/g, '').toUpperCase() === want.join('')) {
          return 'The letters print on one line. Each letter goes on its own line, so print inside the loop, once per letter.'
        }
        if (out.length && out.every((line) => /^\d+$/.test(line.trim()))) {
          return 'The lines show numbers, not letters. A for loop over the text itself gives one letter on each round; range gives numbers.'
        }
        return 'The lines do not spell the label one letter per line, in capitals, without the spaces. Run the file and compare what it prints with the label.'
      }
    })
  },

  count(t) {
    const list = [
      ['Two words', 'Rope bag'],
      ['A longer label', 'Bravo team bag'],
      ['One word', 'Rope'],
      ['Many spaces', 'A B C']
    ]
    return cases(t, {
      file: FILE,
      task: 4,
      name: 'stencils',
      blocks: true,
      typed:
        'Check changed the label and stencils stayed the same. Count the letters of stretcher_label, not a number typed in.',
      mistakes: [
        {
          value: (g) => g.stretcher_label.length,
          hint: 'stencils counts the spaces too. Count a letter only when it is not a space.'
        },
        {
          value: (g) => (g.stretcher_label.endsWith(' ') ? 0 : 1),
          hint: 'stencils is 1, as if it counted only the last letter. It starts again on every round of the loop: a count starts before the loop, and each round adds to it.'
        }
      ],
      list: list.map(([name, label]) => ({
        name,
        given: ({ stretcher_label: label }),
        expected: number(letters(label).length),
        hint: notNumber(
          'stencils',
          'stencils is not the number of letters without the spaces. Count the first case by hand, then compare.'
        )
      }))
    })
  }
}

import { cases, fail, partCode, pass, textNear } from '../../grading.mjs'

const FILE = 'radio_log.py'

const callout = (hill, grid_ref, call_sign, crew_out) => ({ hill, grid_ref, call_sign, crew_out })
const A = callout('Stob Ruadh', 'NN 2741 6385', ' charlie one  ', 9)
const B = callout('Lowther Crag', 'NY 3310 1250', 'alpha 3', 12)
const C = callout('Garve Edge', 'NH 4012 6633', 'Delta four ', 0)

const text = (value) => ({ type: 'str', value })
const hint = (name, want, otherwise) => (v) => textNear(name, v, want) ?? otherwise

export const checks = {
  where(t) {
    const list = [
      ['Joins the hill and the grid reference', A, 'Stob Ruadh, grid NN 2741 6385'],
      ['Works for another callout', B, 'Lowther Crag, grid NY 3310 1250']
    ]
    return cases(t, {
      file: FILE,
      task: 1,
      name: 'location',
      typed:
        'Check changed the callout and location stayed the same. Build it from the names hill and grid_ref, not from text you typed.',
      list: list.map(([name, given, want]) => ({
        name,
        given,
        expected: text(want),
        hint: hint(
          'location',
          want,
          'location is not the hill, a comma, the word grid and the grid reference, in that order. Compare it with the task letter by letter.'
        )
      }))
    })
  },

  sign(t) {
    const list = [
      ['Tidies a call sign with spaces around it', A, 'CHARLIE ONE'],
      ['Works when there are no spaces to remove', B, 'ALPHA 3'],
      ['Works with a capital letter already in it', C, 'DELTA FOUR']
    ]
    return cases(t, {
      file: FILE,
      task: 2,
      name: 'clean_call_sign',
      typed:
        'Check changed the call sign and clean_call_sign stayed the same. Build it from the name call_sign, not from text you typed.',
      mistakes: [
        {
          value: (g) => g.call_sign.toUpperCase(),
          hint: 'clean_call_sign is in capitals, but the spaces around it are still there. Python has a method that removes them.'
        },
        {
          value: (g) => g.call_sign.trim(),
          hint: 'clean_call_sign has lost its spaces, but it is not in capital letters yet. Python has a method for that too.'
        }
      ],
      list: list.map(([name, given, want]) => ({
        name,
        given,
        expected: text(want),
        hint: hint(
          'clean_call_sign',
          want,
          'clean_call_sign should be the same call sign, without the spaces at its start and end, in capital letters.'
        )
      }))
    })
  },

  crew(t) {
    const list = [
      ['Writes the crew out', A, 'Crew out: 9'],
      ['Works with a bigger crew', B, 'Crew out: 12'],
      ['Works when nobody went out', C, 'Crew out: 0']
    ]
    return cases(t, {
      file: FILE,
      task: 3,
      name: 'crew_line',
      typed:
        'Check changed crew_out and crew_line stayed the same. Build it from the name crew_out, not from a number you typed.',
      list: list.map(([name, given, want]) => ({
        name,
        given,
        expected: text(want),
        hint: (v) =>
          v?.type === 'int'
            ? 'crew_line holds a number, but the task asks for text: the words and the number together.'
            : (textNear('crew_line', v, want) ??
              'crew_line should be the words Crew out:, a space, then the number in crew_out, as text.')
      }))
    })
  },

  entry(t) {
    // Task 4 starts from location and clean_call_sign as Tasks 1 and 2 should make them.
    const list = [
      ['Writes the whole entry', A, 'CHARLIE ONE', 'Stob Ruadh, grid NN 2741 6385'],
      ['Works for another callout', B, 'ALPHA 3', 'Lowther Crag, grid NY 3310 1250']
    ]
    return cases(t, {
      file: FILE,
      task: 4,
      name: 'log_entry',
      typed:
        'Check changed the callout and log_entry stayed the same. Put the names inside the f-string, not text you typed.',
      mistakes: [
        {
          value: (g, i) => `${g.call_sign} to ${i.location} with ${g.crew_out} crew`,
          hint: 'log_entry uses the call sign as it came off the radio. The task asks for the tidy one from Task 2.'
        }
      ],
      list: list.map(([name, given, sign, location]) => {
        const want = `${sign} to ${location} with ${given.crew_out} crew`
        return {
          name,
          given,
          inject: { clean_call_sign: sign, location },
          expected: text(want),
          hint: hint(
            'log_entry',
            want,
            'log_entry is not the clean call sign, to, the location, with, the crew and crew, in that order. Compare it with the task word by word.'
          )
        }
      })
    }).then(async (details) => {
      if (!details.every((d) => d.passed)) return details
      const fString = /(^|[^\w])[fF][rR]?["']/.test(await partCode(t, FILE, 4))
      return [
        ...details,
        fString
          ? pass('log_entry is made with an f-string')
          : fail(
              'log_entry is made with an f-string',
              'log_entry comes out right, but the task asks for it to be made with an f-string: one text in quotes with the names inside curly braces.'
            )
      ]
    })
  }
}

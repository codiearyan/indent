import { aKind, cases, LINE_WORDS, lineProblem, outputCases } from '../../grading.mjs'

const FILE = 'route_in.py'
const HELICOPTER = 'Call the helicopter'
const STRETCHER = 'Carry the stretcher'


const text = (value) => ({ type: 'str', value })

/** The words for a variable that is not one of the task's words, or `otherwise`. */
const words = (name, otherwise, missing) => (v) =>
  !v
    ? missing
    : v.type !== 'str'
      ? `${name} holds ${aKind(v.type)}, not text. The words the task gives go inside quotes.`
      : otherwise

/** Why the lines printed are not the one line `want` out of `lines`, or null. */
function oneLine(out, want, lines, wrong) {
  const found = lines.filter((line) => out.includes(line))
  if (found.length > 1) {
    return 'More than one of the lines prints, and only one should. Each line goes in its own branch, so that only the branch that fits runs.'
  }
  if (found.length === 1) return found[0] === want ? null : wrong
  const near = lines.map((line) => lineProblem(out, line)).find((p) => LINE_WORDS[p])
  return near
    ? LINE_WORDS[near]
    : 'The lines under # Task 3 print none of the lines the task gives. Compare what they print with the task, letter for letter.'
}

export const checks = {
  route(t) {
    const missing =
      'route is not made at all in this case: no line gives it a value. An else gives route a value in every case the if does not catch.'
    return cases(t, {
      file: FILE,
      task: 1,
      name: 'route',
      blocks: true,
      typed:
        'Check changed the river and route stayed the same. Decide it with an if that compares river_level with ford_limit, not from a word typed in.',
      mistakes: [
        {
          value: (g) => (g.river_level > g.ford_limit ? 'ford' : 'bridge'),
          hint: 'route comes out the wrong way round in every case: the ford when the river is high, and the bridge when it is low. Look at which branch gives which word.'
        }
      ],
      list: [
        {
          name: 'A high river takes the bridge',
          given: ({ river_level: 1.9, ford_limit: 0.7 }),
          expected: text('bridge'),
          hint: words(
            'route',
            'The river is above the ford limit here, so route should be bridge, spelt as the task gives it.',
            missing
          )
        },
        {
          name: 'A low river takes the ford',
          given: ({ river_level: 0.3, ford_limit: 0.7 }),
          expected: text('ford'),
          hint: words(
            'route',
            'The river is below the ford limit here, so route should be ford, spelt as the task gives it.',
            missing
          )
        },
        {
          name: 'A river exactly at the limit takes the ford',
          given: ({ river_level: 0.9, ford_limit: 0.9 }),
          expected: text('ford'),
          hint: words(
            'route',
            'The river is exactly at the ford limit here. That is not above it, so the ford is still fine. Look at the comparison in your if.',
            missing
          )
        },
        {
          name: 'Another limit',
          given: ({ river_level: 2.6, ford_limit: 2.2 }),
          expected: text('bridge'),
          hint: words(
            'route',
            'The river is above this ford limit, so route should be bridge. Compare with ford_limit, not with a number typed in.',
            missing
          )
        }
      ]
    })
  },

  wind(t) {
    const missing =
      'wind_warning is not made at all in this case: no branch gives it a value. An else at the end catches every case the branches above it do not.'
    const list = [
      ['A gale', 58, 'stay low'],
      ['Exactly 50', 50, 'stay low'],
      ['A strong wind', 42, 'take care'],
      ['Exactly 30', 30, 'take care'],
      ['Just under 30', 29, 'clear'],
      ['A calm night', 6, 'clear']
    ]
    return cases(t, {
      file: FILE,
      task: 2,
      name: 'wind_warning',
      blocks: true,
      typed:
        'Check changed the wind and wind_warning stayed the same. Decide it from wind_speed, not from a word typed in.',
      mistakes: [
        {
          value: (g) => (g.wind_speed >= 30 ? 'take care' : 'clear'),
          hint: 'wind_warning never says stay low, even in a gale. Python checks the branches from the top and runs only the first whose condition is True. A gale is also 30 or more: look at the order of your branches.'
        }
      ],
      list: list.map(([name, wind, warning]) => ({
        name,
        given: ({ wind_speed: wind }),
        expected: text(warning),
        hint: words(
          'wind_warning',
          wind === 50 || wind === 30
            ? `The wind is exactly ${wind} here, and the task says ${wind} or more. One comparison for "bigger" leaves out the equal case.`
            : `With wind of ${wind}, wind_warning should be ${warning}, spelt as the task gives it.`,
          missing
        )
      }))
    })
  },

  helicopter(t) {
    const list = [
      ['Daylight and a light wind', true, 20, HELICOPTER, ''],
      [
        'Daylight and a wind of exactly 40',
        true,
        40,
        STRETCHER,
        'The wind is exactly 40 here, and the helicopter needs it below 40. Look at the comparison for the wind.'
      ],
      [
        'Dark and a light wind',
        false,
        10,
        STRETCHER,
        'It is dark here, so the helicopter cannot come, even though the wind is light. Both things must be true for the helicopter: look at the word that joins them.'
      ],
      [
        'Daylight and a gale',
        true,
        55,
        STRETCHER,
        'The wind is far too strong here, so the helicopter cannot come, even in daylight. Both things must be true for the helicopter: look at the word that joins them.'
      ],
      ['Daylight and a wind just under 40', true, 39, HELICOPTER, '']
    ]
    return outputCases(t, {
      file: FILE,
      task: 3,
      list: list.map(([name, daylight, wind, want, hint]) => ({
        name,
        given: ({ daylight, wind_speed: wind }),
        want,
        hint:
          hint ||
          'It is daylight and the wind is below 40 here, so the helicopter can come. Check each side of your condition.'
      })),
      judge: (out, c) => oneLine(out, c.want, [HELICOPTER, STRETCHER], c.hint)
    })
  },

  name(t) {
    const list = [
      ['A name came over the radio', 'Morven Gow'],
      ['The radio did not catch a name', ''],
      ['Nobody has asked yet', null],
      ['Another name', 'Iain Lindsay']
    ]
    return outputCases(t, {
      file: FILE,
      task: 4,
      list: list.map(([name, casualty]) => ({ name, given: ({ casualty_name: casualty }) })),
      judge: (out, c) => {
        const name = c.given.casualty_name
        const want = name ? `Casualty: ${name}` : 'Casualty: name not known'
        if (out.includes(want)) {
          return out.filter((l) => /^casualty/i.test(l)).length > 1
            ? 'More than one Casualty line prints, and only one should. Each line goes in its own branch.'
            : null
        }
        const printedName = out.some((l) => /^Casualty:/.test(l) && l !== 'Casualty: name not known')
        if (name === null && printedName) {
          return 'casualty_name is None here, and the lines print a Casualty line as if it held a name. None holds no name: look at what your if asks, and at what counts as true.'
        }
        if (name === '' && printedName) {
          return 'casualty_name is empty text here, and the lines print a Casualty line as if it held a name. Empty text is not None, but it holds no name either: look at what your if asks, and at what counts as true.'
        }
        if (name && out.includes('Casualty: name not known')) {
          return 'casualty_name holds a name here, but the lines say it is not known. Look at what your if asks: text with letters in it counts as true, but it is never the same as True.'
        }
        const near = lineProblem(out, want, { label: 'Casualty:', value: name ?? undefined })
        return LINE_WORDS[near]
          ? LINE_WORDS[near]
          : near === 'value'
            ? 'The Casualty line prints, but the name after it is not the one in casualty_name. Print the variable, not a name typed in.'
            : 'The lines under # Task 4 do not print a Casualty line as the task shows it. Compare what they print with the task, letter for letter.'
      }
    })
  }
}

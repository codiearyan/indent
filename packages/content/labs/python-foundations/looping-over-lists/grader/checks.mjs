import { dataCases, fail, partCode, pass } from '../../grading.mjs'

const FILE = 'kit_night.py'

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const down = (list) => [...list].sort((a, b) => b - a)
const up = (list) => [...list].sort((a, b) => a - b)

const FIRST =
  'coldest gives back the first reading. A return inside the loop ends the whole function on the first round: give back the lowest after the loop, once every reading has been looked at.'

/**
 * The functions of a part, without their texts: a print or a call under the task may use what
 * the function itself may not, and a text that holds code is not code.
 */
function functionCode(code) {
  let inDef = false
  return code
    .split('\n')
    .filter((line) => {
      if (!/^\s/.test(line)) inDef = /^def\b/.test(line)
      return inDef
    })
    .join('\n')
    .replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, '""')
}

/** The details, with one more that looks at the code once every case passed. */
async function andCode(t, task, details, name, test, message) {
  if (!details.every((d) => d.passed)) return details
  const code = functionCode(await partCode(t, FILE, task))
  return [...details, test(code) ? pass(name) : fail(name, message)]
}

export const checks = {
  async coldest(t) {
    const list = [
      ['A night above freezing', [6, 4, 9, 5]],
      ['A night below freezing', [-3, -7, -1, -4]],
      ['The coldest reading first', [-6, 2, 0, 1]],
      ['One reading', [8]]
    ]
    const details = await dataCases(t, {
      file: FILE,
      task: 1,
      fn: 'coldest',
      mistakes: [
        {
          value: (c) => c.args[0][0],
          hint: FIRST
        },
        {
          value: (c) => Math.max(...c.args[0]),
          hint: 'coldest gives back the highest reading, not the lowest. Look at the comparison that decides when a reading is the new lowest.'
        }
      ],
      typed:
        'coldest gives back the same reading whatever list Check gives it. Work it out from the readings it is given.',
      list: list.map(([name, readings]) => ({
        name,
        args: [readings],
        expected: Math.min(...readings),
        hint: (v) =>
          v.value === 0 && !readings.includes(0)
            ? 'coldest gives back 0, which is not one of the readings. The lowest so far has to start as a value from the list: a reading of 0 to start with beats every reading above freezing.'
            : v.value === Math.max(...readings)
              ? 'coldest gives back the highest reading, not the lowest. Look at the comparison that decides when a reading is the new lowest.'
              : v.value === readings[0]
                ? FIRST
                : v.value === readings.at(-1)
                  ? 'coldest gives back the last reading. Keep the lowest so far in a name of its own, and change it only when a reading is lower.'
                  : 'coldest does not give back the lowest reading of the list it is given.'
      }))
    })
    return andCode(
      t,
      1,
      details,
      'Finds it with a loop',
      (code) => !/\bmin\s*\(|\bsorted\s*\(|\.sort\s*\(/.test(code),
      'coldest gives back the right reading, but the task asks to find it by hand, with a for loop that keeps the lowest so far. Python can do it for you, and Task 2 is where you use that.'
    )
  },

  load(t) {
    const list = [
      ['Three bags', [12, 7, 15]],
      ['Five bags', [10, 22, 8, 16, 9]],
      ['Two bags the same', [11, 11]]
    ]
    const line = (w) =>
      `${w.length} bags, ${w.reduce((a, b) => a + b, 0)} kg in all, from ${Math.min(...w)} to ${Math.max(...w)} kg`
    return dataCases(t, {
      file: FILE,
      task: 2,
      fn: 'load_line',
      typed:
        'load_line gives back the same line whatever weights Check gives it. Work each number out from the list it is given.',
      list: list.map(([name, weights]) => ({
        name,
        args: [weights],
        expected: line(weights),
        hint: (v) => {
          const got = String(v.value)
          const parts = (s) => s.match(/-?\d+/g) ?? []
          const want = parts(line(weights))
          const have = parts(got)
          if (got.replace(/-?\d+/g, '#') !== line(weights).replace(/-?\d+/g, '#'))
            return 'load_line does not give back a line like the one in the task. Compare its words, commas and spaces with the task, letter by letter.'
          if (have[0] !== want[0]) return 'The number of bags is not how many weights the list holds.'
          if (have[1] !== want[1]) return 'The total is not all the weights added up.'
          if (have[2] === want[3] && have[3] === want[2])
            return 'load_line has the lightest and the heaviest the wrong way round. The line goes from the lightest to the heaviest.'
          return 'The lightest or the heaviest weight is not right.'
        }
      }))
    })
  },

  heaviest(t) {
    const list = [
      ['Four bags', [14, 20, 6, 11]],
      ['Two bags the same', [9, 17, 9]],
      ['In order already', [5, 8, 13]]
    ]
    return dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'heaviest_first',
      typed:
        'heaviest_first gives back the same list whatever weights Check gives it. Make it from the list it is given.',
      list: list.map(([name, weights]) => ({
        name,
        args: [weights],
        expected: down(weights),
        noneHint:
          'heaviest_first gives back None. Look at the return line. A method such as sort changes the list itself, and what it gives back is always None.',
        hint: (v) =>
          same(v.data, up(weights))
            ? 'heaviest_first gives back the weights from the lightest to the heaviest. The task asks for the heaviest first.'
            : same(v.data, weights)
              ? 'heaviest_first gives back the weights in the order they came in.'
              : 'heaviest_first does not give back the same weights, from the heaviest to the lightest.'
      }))
    })
  },

  lines(t) {
    const list = [
      ['Three items', ['torch', 'map', 'whistle']],
      ['One item', ['splint']],
      ['No items', []]
    ]
    return dataCases(t, {
      file: FILE,
      task: 4,
      fn: 'kit_lines',
      errors: (error) =>
        error.type === 'UnboundLocalError'
          ? 'the line reads a name before it has a value. With no items the loop runs no rounds, so a list made inside the loop is never made: make the new list before the loop, and give it back after'
          : null,
      typed:
        'kit_lines gives back the same lines whatever kit Check gives it. Make them from the list it is given.',
      list: list.map(([name, items]) => ({
        name,
        args: [items],
        expected: items.map((item, i) => `${i + 1}. ${item}`),
        hint: (v) => {
          const got = Array.isArray(v.data) ? v.data : []
          if (same(got, items.map((item, i) => `${i}. ${item}`)))
            return 'The numbers start at 0. enumerate counts from 0 unless it is told where to start, and the kit list starts at 1.'
          if (items.length > 1 && got.length === 1)
            return 'kit_lines gives back only one line. A list that is made inside the loop starts again empty on every round: make it before the loop, and give it back after.'
          if (got.length !== items.length) return 'kit_lines does not give back one line for each item.'
          return 'Each line is the number, a full stop, a space and the item. Compare the lines with the task, letter by letter.'
        }
      }))
    })
  },

  async ropes(t) {
    const list = [
      ['Some long enough', [40, 65, 55, 20, 80], 55],
      ['None long enough', [30, 25], 50],
      ['All long enough', [60, 70], 60]
    ]
    const details = await dataCases(t, {
      file: FILE,
      task: 5,
      fn: 'long_enough',
      typed:
        'long_enough gives back the same list whatever ropes Check gives it. Make it from the lengths and the need it is given.',
      list: list.map(([name, lengths, need]) => ({
        name,
        args: [lengths, need],
        expected: lengths.filter((l) => l >= need),
        hint: (v) =>
          same(v.data, lengths.filter((l) => l > need))
            ? `A rope of exactly ${need} metres is long enough: the task says at least that long.`
            : same(v.data, lengths.filter((l) => l < need)) || same(v.data, lengths.filter((l) => l <= need))
              ? 'long_enough gives back the ropes that are too short. Look at the comparison in the if of your comprehension.'
              : 'long_enough does not give back the lengths that are at least the need, in the order they came in.'
      }))
    })
    return andCode(
      t,
      5,
      details,
      'Written as a list comprehension',
      (code) => /\[[^[\]]*\bfor\b[^[\]]*\bin\b[^[\]]*\]/.test(code),
      'long_enough gives back the right list, but the task asks for it as a list comprehension: the whole list in one pair of square brackets, with the for inside them.'
    )
  }
}

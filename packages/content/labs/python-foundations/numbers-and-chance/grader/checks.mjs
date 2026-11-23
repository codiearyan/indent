import {
  atLine,
  dataCases,
  equalData,
  errorWords,
  fail,
  firstLines,
  pass,
  problem,
  pyLiteral,
  runFile,
  stoppedText,
  tuple
} from '../../grading.mjs'

const FILE = 'callout_numbers.py'

/** A number as Python may give it back: a whole number may come back as 3 or as 3.0. */
const forms = (n) => (Number.isInteger(n) ? [n, { '@float': n }] : [n])
/** round() as Python does it: a half goes to the even number, so 2.5 rounds to 2. */
const pyRound = (x) => (Math.abs(x % 1) === 0.5 ? 2 * Math.round(x / 2) : Math.round(x))
const pairs = (a, b) => forms(a).flatMap((x) => forms(b).map((y) => tuple(x, y)))

export const checks = {
  legs(t) {
    const list = [
      ['Exactly two reaches apart', [0, 0], [3000, 4000], 2500],
      ['A little more than one reach', [100, 100], [1300, 1700], 1500],
      ['Less than one reach, from west of the base', [-600, 800], [0, 0], 1500],
      ['Two and a half reaches, south of the base', [-1000, -1000], [4000, -1000], 2000],
      ['The same place', [250, -250], [250, -250], 1000]
    ]
    return dataCases(t, {
      file: FILE,
      task: 1,
      fn: 'radio_legs',
      modules: true,
      typed: 'radio_legs gives back the same number whatever Check gives it. Work it out from the positions and the reach it is given.',
      mistakes: [
        {
          value: (c) => Math.trunc(c.exact),
          hint: 'radio_legs cuts off what is after the point, and the task asks to round up: part of a reach still needs a whole person.'
        },
        {
          value: (c) => pyRound(c.exact),
          hint: 'radio_legs rounds to the nearest whole number, which is sometimes down, and the task asks to round up: part of a reach still needs a whole person.'
        },
        {
          value: (c) => Math.floor(c.exact) + 1,
          hint: 'radio_legs gives one person too many when the distance is exactly a whole number of reaches. Round up: a whole number stays as it is.'
        },
        {
          value: (c) => Math.ceil(c.corner),
          hint: 'radio_legs adds the distance east and the distance north, which is the way round the corner. The straight distance is the square root of east squared plus north squared.'
        }
      ],
      list: list.map(([name, start, end, reach]) => {
        const east = end[0] - start[0]
        const north = end[1] - start[1]
        const exact = Math.sqrt(east * east + north * north) / reach
        const want = Math.ceil(exact)
        return {
          name,
          exact,
          corner: (Math.abs(east) + Math.abs(north)) / reach,
          args: [tuple(...start), tuple(...end), reach],
          expected: want,
          accept: [{ '@float': want }],
          hint: 'radio_legs does not give back the straight distance divided by the reach, rounded up.'
        }
      })
    })
  },

  square(t) {
    const list = [
      ['East and south of the base', [2400, -1800], 1000],
      ['Just west of the base', [-1, 1], 1000],
      ['On the edge of a square, west', [-3000, 500], 1000],
      ['Smaller squares', [999, -1000], 500]
    ]
    return dataCases(t, {
      file: FILE,
      task: 2,
      fn: 'square_of',
      modules: true,
      typed: 'square_of gives back the same square whatever Check gives it. Work it out from the position and the size it is given.',
      mistakes: [
        {
          value: (c) => tuple(...c.parts.map(Math.trunc)),
          hint: 'square_of rounds a part below 0 towards 0, the way int() cuts off what is after the point, so -1.8 becomes -1. Rounded down, it is -2: round down goes to the smaller number, below 0 too.'
        },
        {
          value: (c) => tuple(...c.parts.map(pyRound)),
          hint: 'square_of rounds to the nearest whole number, and the task asks to round down.'
        },
        {
          value: (c) => tuple(...c.parts.map(Math.ceil)),
          hint: 'square_of rounds up, and the task asks to round down.'
        }
      ],
      list: list.map(([name, position, size]) => {
        const parts = position.map((p) => p / size)
        const want = parts.map(Math.floor)
        return {
          name,
          parts,
          args: [tuple(...position), size],
          expected: tuple(...want),
          accept: [tuple(...want.map((n) => ({ '@float': n })))],
          hint: 'square_of does not give back each part of the position divided by the size, rounded down, as (east, north).'
        }
      })
    })
  },

  summary(t) {
    const list = [
      ['Six callouts', [3, 5, 2, 6, 4, 12]],
      ['Three callouts, not in order', [7, 1, 3]],
      ['Two callouts', [2, 4]],
      ['Hours with fractions', [1.5, 2.25, 0.75, 3.5]],
      ['Five callouts, not in order', [10, 2, 9, 4, 1]]
    ]
    return dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'hours_summary',
      modules: true,
      typed: 'hours_summary gives back the same numbers whatever hours Check gives it. Work them out from the list it is given.',
      list: list.map(([name, hours]) => {
        const mean = hours.reduce((a, b) => a + b, 0) / hours.length
        const sorted = [...hours].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
        const [first, ...others] = pairs(mean, median)
        return {
          name,
          args: [hours],
          expected: first,
          accept: others,
          hint: (v) => {
            const got = v.data?.['@tuple']?.map((x) => x?.['@float'] ?? x)
            if (!got || got.length !== 2) return 'hours_summary does not give back a tuple of two numbers, the mean and the median.'
            const [m, md] = got
            if (m === median && md === mean && mean !== median)
              return 'hours_summary gives back the median first and the mean second. The task asks for the mean first, then the median.'
            const h = hours.length
            const middle = h % 2 ? hours[Math.floor(h / 2)] : (hours[h / 2 - 1] + hours[h / 2]) / 2
            if (m === Math.floor(hours.reduce((a, b) => a + b, 0) / h) && m !== mean)
              return 'hours_summary gives back the mean as a whole number, cut short. // divides and throws away what is left; the mean keeps it.'
            if (m !== mean) return 'The first number hours_summary gives back is not the mean of the hours.'
            if (md === middle && md !== median)
              return 'hours_summary takes the middle of the list as it was given. The median is the middle once the hours are in order.'
            if (md === sorted[mid] && md !== median)
              return 'For an even number of hours, hours_summary gives back one of the two in the middle. The median of an even number of values is halfway between the two middle ones.'
            return 'The second number hours_summary gives back is not the median of the hours.'
          }
        }
      })
    })
  },

  rota(t) {
    return draws(t, {
      task: 4,
      fn: 'duty_rota',
      list: [
        ['Seed 11', ['Morag', 'Fergus', 'Kirsty', 'Iain', 'Shona', 'Calum', 'Eilidh', 'Ewan', 'Ishbel'], 11],
        ['Seed 2041', ['Morag', 'Fergus', 'Kirsty', 'Iain', 'Shona', 'Calum', 'Eilidh', 'Ewan', 'Ishbel'], 2041],
        ['Another team, seed 90', ['Ruaridh', 'Isla', 'Hamish', 'Catriona', 'Euan'], 90]
      ].map(([name, team, seed]) => ({ name, args: [team, seed] })),
      judge: (c, got) => {
        const [team] = c.args
        if (!Array.isArray(got)) return `duty_rota gives back ${got === null ? 'None' : 'something that is not a list'}, and the task asks for a new list of the volunteers.`
        const count = (list) => list.reduce((m, n) => m.set(n, (m.get(n) ?? 0) + 1), new Map())
        const twice = [...count(got)].find(([, n]) => n > 1)?.[0]
        if (twice) return `In the rota duty_rota gives back, ${twice} is on more than once. Drawing each place by chance can pick the same volunteer again; shuffling the list itself puts every volunteer on it once.`
        if (got.length !== team.length || !team.every((n) => got.includes(n)))
          return 'The rota duty_rota gives back does not hold every volunteer it was given, each once.'
        return null
      },
      across: (gots, list) => {
        if (gots.every((got, i) => equalData(got, list[i].args[0])))
          return 'duty_rota gives back every list in the order it was given. The task asks for the volunteers in a shuffled order.'
        if (gots.slice(0, 2).every((got) => equalData(got, gots[0])))
          return 'duty_rota gives back the same order for the seeds 11 and 2041. The order should come from the seed it is given.'
        return null
      }
    })
  },

  drivers(t) {
    return draws(t, {
      task: 5,
      fn: 'drivers',
      list: [
        ['Seven nights, seed 5', ['Morag', 'Fergus', 'Kirsty', 'Iain', 'Shona'], 7, 5],
        ['Seven nights, seed 2063', ['Morag', 'Fergus', 'Kirsty', 'Iain', 'Shona'], 7, 2063],
        ['More nights than volunteers, seed 12', ['Ruaridh', 'Isla', 'Hamish'], 9, 12],
        ['One night, seed 31', ['Euan', 'Catriona'], 1, 31],
        ['A month of nights, three volunteers, seed 77', ['Ruaridh', 'Isla', 'Hamish'], 30, 77]
      ].map(([name, team, nights, seed]) => ({ name, args: [team, nights, seed] })),
      errors: (e) =>
        /^Sample larger than population/.test(e.message)
          ? 'random.sample draws each volunteer at most once, so it cannot fill more nights than there are volunteers. The task lets a volunteer drive more than once: draw each night by itself'
          : null,
      judge: (c, got) => {
        const [team, nights] = c.args
        if (!Array.isArray(got)) return `drivers gives back ${got === null ? 'None' : 'something that is not a list'}, and the task asks for a list of one volunteer for each night.`
        if (got.length !== nights) return `drivers gives back ${got.length} ${got.length === 1 ? 'name' : 'names'} for ${nights} ${nights === 1 ? 'night' : 'nights'}. The task asks for one volunteer for each night.`
        const stranger = got.find((n) => !team.includes(n))
        if (stranger !== undefined) return `drivers gives back ${pyLiteral(stranger)}, who is not on the list it was given.`
        if (nights > 2 && got.every((n) => n === got[0]))
          return 'drivers gives back the same volunteer for every night. Setting the seed again before each draw starts the same run of chance again, so every draw comes out the same: set it once, before the loop.'
        // Thirty nights from three volunteers: a fair draw leaves one out, or never repeats a night,
        // about once in a hundred thousand seeds, and the seed here is fixed.
        if (nights >= 30) {
          const left = team.find((n) => !got.includes(n))
          if (left) return `In thirty nights drivers never draws ${pyLiteral(left)}. Each night is drawn by chance from the whole list it was given.`
          if (got.every((n, i) => i === 0 || n !== got[i - 1]))
            return 'In thirty nights drivers never gives anyone two nights running, so the nights are not drawn by themselves: each night is drawn by chance from the whole list, whoever drove the night before.'
        }
        return null
      },
      across: (gots) =>
        equalData(gots[0], gots[1])
          ? 'drivers gives back the same drivers for the seeds 5 and 2063. The drivers should come from the seed it is given.'
          : null
    })
  }
}

/**
 * Calls Check's own _judge in the learner's file, which calls `fn` twice with the same arguments,
 * the random module set to two other states before each call, and reports both results and the
 * list it was given afterwards. So a function that sets the seed it is given gives the same
 * answer both times, one that does not gives two, and nothing depends on a draw typed in.
 */
const JUDGE = `
import random as _random


def _judge(name, args, befores):
    fn = globals().get(name)
    if not callable(fn):
        return {"missing": fn is None, "type": type(fn).__name__}
    given = args[0]
    kept = list(given)
    _random.seed(befores[0])
    first = fn(*args)
    found = {"first": first, "same": first is given, "after": list(given)}
    _random.seed(befores[1])
    found["again"] = fn(*([list(kept)] + list(args[1:])))
    return found
`

async function draws(t, { task, fn, list, judge, across, errors }) {
  const runs = await Promise.all(
    list.map((c, i) =>
      runFile(t, FILE, {
        upto: task,
        blocks: true,
        data: true,
        modules: true,
        define: JUDGE,
        call: { name: '_judge', args: [fn, c.args, [1000 + i * 17, 5000 + i * 31]] }
      })
    )
  )
  for (const r of runs) if (r.blocks && errors) r.blocks.explain = errors
  const details = []
  const gots = []
  for (const [i, c] of list.entries()) {
    const r = runs[i]
    const shown = `${fn}(${c.args.map(pyLiteral).join(', ')})`
    const p = problem(r, FILE, task)
    if (p) return [p]
    const call = r.call
    if (!call) return [fail(c.name, `Python stopped without a word while Check called ${shown}.`, r.crashed)]
    if (call.stopped) return [fail(c.name, stoppedText(call.stopped, shown, 'it'))]
    if (call.error) {
      return [
        fail(
          c.name,
          `When Check calls ${shown}, it stops${atLine(call.error)} with ${call.error.type}: ${errorWords(call.error, call.names, r.blocks)}.`,
          `Check called ${shown}\n${call.error.shown}`
        )
      ]
    }
    const found = Object.fromEntries(call.returned.data['@dict'])
    if ('missing' in found) {
      return [
        fail(
          `${fn} is there`,
          found.missing
            ? `Check cannot find a function called ${fn} after the lines under # Task ${task}. Make it there with def and exactly that name.`
            : `${fn} is not a function. A function is made with def, its name, round brackets and a colon.`
        )
      ]
    }
    const got = found.first
    gots.push(got)
    const output = [
      `Check called ${shown} twice, with the random module in two other states first`,
      `The first time it gave back: ${pyLiteral(got)}`,
      `The second time it gave back: ${pyLiteral(found.again)}`,
      call.lines.length ? `It printed:\n${firstLines(call.lines).join('\n')}` : 'It printed nothing'
    ].join('\n')
    const message =
      judge(c, got) ??
      (!equalData(found.after, c.args[0])
        ? `${fn} changed the list Check gave it. The caller's list is the same list as the parameter, and shuffle or remove change a list itself: work on a copy, and leave the list it is given as it was.`
        : !equalData(found.again, got)
          ? `${fn} gave back something different the second time, for the same seed. It must set the random module to the seed it is given, before it draws anything, so the same seed gives the same answer.`
          : null)
    details.push(message ? fail(c.name, message, output) : pass(c.name, output))
  }
  if (details.every((d) => d.passed)) {
    const message = across(gots, list)
    details.push(message ? fail('A different seed gives a different draw', message) : pass('A different seed gives a different draw'))
  }
  return details
}

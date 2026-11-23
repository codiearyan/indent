import { fail, judgeLines, line } from '../../grading.mjs'

const FILE = 'src/rounds.cpp'
const HEADER = 'Morning round'

const round = (o) => ({
  clocksToWind: 1,
  fromHour: 1,
  toHour: 1,
  serialNumber: 1,
  springsInBox: 0,
  springsPerClock: 1,
  clocksWaiting: 0,
  ...o
})

const stuck = (label) =>
  `${label} did not finish within 3 seconds, so Check stopped it: a loop in it never ends. Its condition stays true every time round, so look at what changes inside the loop, and whether it moves toward the end.`

const flood = (label) =>
  `${label} printed without end, so Check stopped it: a loop in it never ends. Its condition stays true every time round, so look at what changes inside the loop, and whether it moves toward the end.`

const usesLoop = (label, keywords, words) => (section) =>
  new RegExp(`\\b(?:${keywords})\\s*\\(`).test(section.code)
    ? null
    : fail(
        `${label} uses a loop`,
        `${label} asks you to work it out with ${words}, so it works for any numbers Check gives. Write the loop under // ${label}.`
      )

export const checks = {
  wind(t) {
    return judgeLines(t, {
      file: FILE,
      task: 1,
      header: HEADER,
      stuck: stuck('Task 1'),
      flood: flood('Task 1'),
      source: usesLoop('Task 1', 'for|while', 'a loop'),
      typed:
        'Check changed clocksToWind and the same lines came out. Let the loop run from 1 up to clocksToWind, not up to a number you typed.',
      cases: [3, 1, 0, 7].map((n) => ({
        name: n === 0 ? 'No clocks to wind' : `${n} ${n === 1 ? 'clock' : 'clocks'} to wind`,
        given: round({ clocksToWind: n }),
        printed: Array.from({ length: n }, (_, i) => line(`Wind clock ${i + 1}`)),
        hint: ({ lines }) =>
          lines.length === n + 1
            ? lines[0] === 'Wind clock 0'
              ? 'There is one line too many: the list starts at clock 0. The clocks are numbered from 1.'
              : "There is one line too many at the end. The last clock is number clocksToWind: look at the loop's condition."
            : lines.length === n - 1
              ? 'One clock is missing from the list. The clocks go from 1 up to clocksToWind, both included: look at where the loop starts and at its condition.'
              : n === 0 && lines.length
                ? "With no clocks to wind, nothing is printed. The loop's condition is false from the start, so its body never runs."
                : 'The lines are not Wind clock 1, Wind clock 2 and so on, one for each clock, written exactly as the task shows.'
      }))
    })
  },

  strikes(t) {
    const cases = [
      [3, 5],
      [1, 1],
      [9, 12],
      [2, 7]
    ]
    return judgeLines(t, {
      file: FILE,
      task: 2,
      header: HEADER,
      stuck: stuck('Task 2'),
      flood: flood('Task 2'),
      vars: { strikes: 'int' },
      source: usesLoop('Task 2', 'for|while', 'a loop'),
      typed:
        'Check changed the hours and strikes stayed the same. Add up the hours from fromHour to toHour, not a number you worked out by hand.',
      cases: cases.map(([fromHour, toHour]) => {
        let sum = 0
        for (let h = fromHour; h <= toHour; h++) sum += h
        return {
          name: `From ${fromHour} o'clock to ${toHour} o'clock`,
          given: round({ fromHour, toHour }),
          expect: { strikes: sum },
          printed: [line(`Strikes: ${sum}`)],
          hint: ({ reads }) =>
            reads.strikes === sum
              ? 'strikes is right, but the printed line is not. Print Strikes: and then strikes, once, after the loop.'
              : reads.strikes === sum - toHour
                ? "The strikes of the last hour are missing. toHour is included: look at the loop's condition."
                : reads.strikes === sum - fromHour
                  ? 'The strikes of the first hour are missing. fromHour is included: look at where the loop starts.'
                  : reads.strikes === toHour - fromHour + 1
                    ? "strikes counts the hours, not the strikes. Each hour adds its own number of strikes: one at one o'clock, two at two."
                    : 'strikes is not the strikes of every hour from fromHour to toHour added up. Look at where the total starts, and at what each time round adds to it.'
        }
      })
    })
  },

  serial(t) {
    const cases = [4021, 9, 99999, 1000, 0]
    const digits = (n) =>
      String(n)
        .split('')
        .reduce((a, d) => a + Number(d), 0)
    return judgeLines(t, {
      file: FILE,
      task: 3,
      header: HEADER,
      stuck: stuck('Task 3'),
      flood: flood('Task 3'),
      vars: { digitSum: 'int' },
      source: usesLoop('Task 3', 'while', 'a while loop'),
      typed:
        'Check changed the serial number and digitSum stayed the same. Work it out from serialNumber, not from digits you added by hand.',
      cases: cases.map((serialNumber) => ({
        name: `Serial number ${serialNumber}`,
        given: round({ serialNumber }),
        expect: { digitSum: digits(serialNumber) },
        printed: [line(`Check number: ${digits(serialNumber)}`)],
        hint: ({ reads }) =>
          reads.digitSum === digits(serialNumber)
            ? 'digitSum is right, but the printed line is not. Print Check number: and then digitSum, once, after the loop.'
            : reads.digitSum === serialNumber % 10
              ? 'digitSum holds only the last digit. The loop has to go on to every digit of the number.'
              : 'digitSum is not the digits of serialNumber added up. Look at what the loop does with each digit, and whether it reaches every one.'
      }))
    })
  },

  springs(t) {
    const cases = [
      [10, 3, 5],
      [6, 2, 3],
      [0, 4, 2],
      [8, 4, 3],
      [5, 1, 0]
    ]
    return judgeLines(t, {
      file: FILE,
      task: 4,
      header: HEADER,
      stuck: stuck('Task 4'),
      flood: flood('Task 4'),
      vars: { springsLeft: 'int' },
      typed:
        'Check changed the box and the clocks, and the same lines came out. Let the loop and springsLeft decide every line.',
      cases: cases.map(([springsInBox, springsPerClock, clocksWaiting]) => {
        const want = []
        let left = springsInBox
        for (let clock = 1; clock <= clocksWaiting; clock++) {
          if (left < springsPerClock) {
            want.push(`Out of springs at clock ${clock}`)
            break
          }
          left -= springsPerClock
          want.push(`Clock ${clock}: fitted`)
        }
        const runsOut = want.at(-1)?.startsWith('Out')
        return {
          name: `${springsInBox} springs, ${springsPerClock} a clock, ${clocksWaiting} ${clocksWaiting === 1 ? 'clock' : 'clocks'} waiting`,
          given: round({ springsInBox, springsPerClock, clocksWaiting }),
          expect: { springsLeft: left },
          printed: want.map(line),
          hint: ({ reads, lines }) => {
            const outAt = (list) =>
              Number(
                /^Out of springs at clock (\d+)$/.exec(
                  list.find((l) => l.startsWith('Out')) ?? ''
                )?.[1] ?? 0
              )
            const early = outAt(lines) > 0 && (outAt(want) === 0 || outAt(lines) < outAt(want))
            const outs = lines.filter((l) => l.startsWith('Out of springs')).length
            const outIndex = lines.findIndex((l) => l.startsWith('Out of springs'))
            return outs > 1
              ? 'Out of springs is printed more than once. Once the springs run out, the loop stops going through the clocks.'
              : outIndex !== -1 && outIndex < lines.length - 1
                ? 'Lines come after Out of springs. Once the springs run out, the loop stops going through the clocks.'
                : early
                  ? 'Out of springs comes too early: the springs left were exactly enough for that clock. A clock can be fitted when the springs left are exactly enough for it.'
                  : reads.springsLeft !== left
                    ? 'springsLeft does not end with the springs that are left. Take springsPerClock from it for each clock fitted, and only then.'
                    : runsOut && outs === 0
                      ? 'The springs run out here, and the line that says so is missing.'
                      : 'The lines are not one Clock N: fitted for each clock fitted, then Out of springs at clock N when the box runs out, written exactly as the task shows.'
          }
        }
      })
    })
  }
}

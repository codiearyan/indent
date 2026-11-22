import { judge, line, numberLine } from '../../grading.mjs'

const FILE = 'src/prices.cpp'
const SECONDS_A_YEAR = 60 * 60 * 24 * 365

const bill = (o) => ({
  hourlyRate: 38.5,
  hoursWorked: 3,
  screwsInBox: 14,
  screwsPerBag: 4,
  minutesTotal: 250,
  jobsDone: 4,
  beatsPerSecond: 8,
  guaranteeYears: 10,
  partsCost: 12.4,
  ...o
})

/** What an int holds after a sum that went past its top: it wraps round to the bottom. */
const wrapped = (n) => ((((n + 2 ** 31) % 2 ** 32) + 2 ** 32) % 2 ** 32) - 2 ** 31

export const checks = {
  labour(t) {
    const cases = [
      bill({ hourlyRate: 42.5, hoursWorked: 2 }),
      bill({ hourlyRate: 36.75, hoursWorked: 4 }),
      bill({ hourlyRate: 29.9, hoursWorked: 1 })
    ]
    return judge(t, {
      file: FILE,
      task: 1,
      vars: { labour: 'double' },
      typed:
        'Check changed the rate and the hours, and labour stayed the same. Build it from hourlyRate and hoursWorked, not from numbers you typed.',
      cases: cases.map((g) => ({
        name: `${g.hoursWorked} hours at ${g.hourlyRate}`,
        given: g,
        expect: { labour: g.hourlyRate * g.hoursWorked },
        lines: [numberLine('Labour: ', g.hourlyRate * g.hoursWorked)],
        hint: ({ reads }) =>
          Math.abs(reads.labour - g.hourlyRate * g.hoursWorked) < 1e-9
            ? 'labour is right, but the printed line is not. Print Labour: and then labour.'
            : 'labour is not the hourly rate times the hours worked here. Which operator multiplies?'
      }))
    })
  },

  bags(t) {
    const cases = [
      bill({ screwsInBox: 23, screwsPerBag: 5 }),
      bill({ screwsInBox: 12, screwsPerBag: 4 }),
      bill({ screwsInBox: 3, screwsPerBag: 8 })
    ]
    return judge(t, {
      file: FILE,
      task: 2,
      vars: { fullBags: 'int', leftOver: 'int' },
      typed:
        'Check changed the box and the bags stayed the same. Build them from screwsInBox and screwsPerBag, not from numbers you typed.',
      cases: cases.map((g) => {
        const full = Math.trunc(g.screwsInBox / g.screwsPerBag)
        const left = g.screwsInBox % g.screwsPerBag
        return {
          name: `${g.screwsInBox} screws, ${g.screwsPerBag} to a bag`,
          given: g,
          expect: { fullBags: full, leftOver: left },
          lines: [line(`Full bags: ${full}, left over: ${left}`)],
          hint: ({ reads }) =>
            reads.fullBags !== full
              ? 'fullBags is not the number of full bags here. Dividing one int by another keeps only the whole part, which is what a count of full bags needs.'
              : reads.leftOver !== left
                ? 'leftOver is not the screws left once the full bags are packed. One operator gives what is left after dividing whole numbers.'
                : 'Both numbers are right, but the printed line is not. Compare it with the task, spaces and comma included.'
        }
      })
    })
  },

  average(t) {
    const cases = [
      bill({ minutesTotal: 95, jobsDone: 2 }),
      bill({ minutesTotal: 100, jobsDone: 8 }),
      bill({ minutesTotal: 90, jobsDone: 3 })
    ]
    return judge(t, {
      file: FILE,
      task: 3,
      vars: { averageMinutes: 'double' },
      typed:
        'Check changed the minutes and the jobs, and averageMinutes stayed the same. Build it from minutesTotal and jobsDone, not from numbers you typed.',
      cases: cases.map((g) => {
        const avg = g.minutesTotal / g.jobsDone
        return {
          name: `${g.minutesTotal} minutes over ${g.jobsDone} jobs`,
          given: g,
          expect: { averageMinutes: avg },
          lines: [line(`Average: ${avg} minutes`)],
          hint: ({ reads }) =>
            reads.averageMinutes === Math.trunc(avg) && avg !== Math.trunc(avg)
              ? 'averageMinutes lost its decimals. Both numbers are ints, so the division is done in whole numbers before the result goes into the double. Turn one of them into a double before you divide.'
              : Math.abs(reads.averageMinutes - avg) < 1e-9
                ? 'averageMinutes is right, but the printed line is not. Print Average:, averageMinutes and minutes.'
                : 'averageMinutes is not the minutes divided by the jobs here. Look at what you divide by what.'
        }
      })
    })
  },

  beats(t) {
    const cases = [
      bill({ beatsPerSecond: 6, guaranteeYears: 12 }),
      bill({ beatsPerSecond: 10, guaranteeYears: 7 }),
      bill({ beatsPerSecond: 2, guaranteeYears: 3 })
    ]
    return judge(t, {
      file: FILE,
      task: 4,
      vars: { guaranteeBeats: 'long long' },
      typed:
        'Check changed the watch and the guarantee, and guaranteeBeats stayed the same. Build it from beatsPerSecond and guaranteeYears, not from a number you typed.',
      cases: cases.map((g) => {
        const beats = g.beatsPerSecond * SECONDS_A_YEAR * g.guaranteeYears
        return {
          name: `${g.beatsPerSecond} beats a second for ${g.guaranteeYears} years`,
          given: g,
          expect: { guaranteeBeats: beats },
          lines: [line(`Beats: ${beats}`)],
          hint: ({ reads }) =>
            reads.guaranteeBeats === wrapped(beats) && beats !== wrapped(beats)
              ? 'guaranteeBeats is wrong for a long guarantee, though the type is right. The multiplication is worked out in int, which tops out a little over two billion, before the result goes into the long long. Read the part of the lesson on how big a number can get.'
              : reads.guaranteeBeats === beats
                ? 'guaranteeBeats is right, but the printed line is not. Print Beats: and then guaranteeBeats.'
                : 'guaranteeBeats is not the beats in a second, times the seconds in a year of 365 days, times the years. Count the seconds in a day again.'
        }
      })
    })
  },

  parts(t) {
    const cases = [7.5, 19.95, 3]
    return judge(t, {
      file: FILE,
      task: 5,
      typed: 'Check changed the parts price and the line stayed the same. Print partsCost, not a price you typed.',
      storyLines: [line('Parts: 12.40')],
      cases: cases.map((p) => ({
        name: `Parts of ${p}, with two decimals`,
        given: bill({ partsCost: p }),
        lines: [line(`Parts: ${p.toFixed(2)}`)],
        hint: ({ stdout }) =>
          stdout.includes('Parts: ')
            ? 'The parts price does not have exactly two digits after the point. Read the part of the lesson on printing prices: it shows what a price needs to always print two digits after the point, and the header those tools come from.'
            : 'No line starts with Parts: yet. Print Parts: and then partsCost, with two digits after the point.'
      }))
    })
  }
}

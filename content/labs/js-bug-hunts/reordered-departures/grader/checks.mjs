import { isDeepStrictEqual } from 'node:util'
import { nextDepartures as buggy } from '../starter/src/departures.js'
import { harbourTour } from '../starter/src/timetable.js'

const show = (r) => (r.ok ? JSON.stringify(r.value) : r.error)
const clear = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))

export const checks = {
  async reproduce(t) {
    const dir = await t.sandbox({ 'src/departures.js': t.chapterPath('starter/src/departures.js') })
    const r = await t.call(dir, 'src/reproduce.js', 'reproduceReorder')
    if (!r.ok) {
      return [
        {
          name: 'reproduceReorder returns a result',
          passed: false,
          message: 'reproduceReorder threw instead of returning { before, result, after }. Read the error.',
          output: r.error
        }
      ]
    }
    const copy = [...harbourTour]
    const result = buggy(copy, 600)
    const { before, result: got, after } = r.value ?? {}
    const output = `${show(r)}\n\nexpected after: ${JSON.stringify(copy)}`
    return clear([
      {
        name: 'before is the timetable as it was',
        passed: isDeepStrictEqual(before, harbourTour),
        message: 'before should hold the copy of harbourTour before you call nextDepartures. Copy it again so later changes do not reach it.',
        output
      },
      {
        name: 'result is what nextDepartures returned',
        passed: isDeepStrictEqual(got, result),
        message: 'result should be exactly what nextDepartures(copy, 600) returned.',
        output
      },
      {
        name: 'after shows the timetable was reordered',
        passed: isDeepStrictEqual(after, copy),
        message: 'after should be the same array you passed in, read after the call. Did you return a fresh copy instead of the array itself?',
        output
      }
    ])
  },

  async fix(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const call = (...args) => t.call(dir, '.grader/drive.mjs', 'run', args)
    const unsorted = [1020, 540, 900, 75, 600]
    const [tour, mixed, many, late, frozen] = await Promise.all([
      call(harbourTour, 600),
      call(unsorted, 0, 4),
      call(harbourTour, 1000, 5),
      call(harbourTour, 1200),
      t.call(dir, '.grader/drive.mjs', 'frozen', [harbourTour, 600])
    ])
    const result = (r) => (r.ok ? r.value.result : undefined)
    return clear([
      {
        name: 'Next tours after 10:00 are in time order',
        passed: isDeepStrictEqual(result(tour), [600, 690, 780]),
        message: 'nextDepartures(harbourTour, 600) should give the three tours from 10:00 on, earliest first. Look at how sort() compares numbers when you give it no function.',
        output: show(tour)
      },
      {
        name: 'A mixed up list is sorted by value',
        passed: isDeepStrictEqual(result(mixed), [75, 540, 600, 900]),
        message: 'With times [1020, 540, 900, 75, 600] the earliest four should come back in order. 75 is smaller than 540 even though "75" comes after "540" as text.',
        output: show(mixed)
      },
      {
        name: 'Returns fewer when fewer are left',
        passed: isDeepStrictEqual(result(many), [1020, 1110]),
        message: 'Asking for 5 tours after 16:40 should give only the two that are left.',
        output: show(many)
      },
      {
        name: 'Returns an empty list after the last tour',
        passed: isDeepStrictEqual(result(late), []),
        message: 'After 20:00 there are no tours left.',
        output: show(late)
      },
      {
        name: "The caller's array is left unchanged",
        passed:
          isDeepStrictEqual(mixed.value?.after, unsorted) &&
          isDeepStrictEqual(tour.value?.after, harbourTour),
        message: 'After the call the array that was passed in had a different order. sort() changes the array you call it on.',
        output: `passed in ${JSON.stringify(unsorted)}\narray afterwards ${JSON.stringify(mixed.value?.after)}`
      },
      {
        name: 'Works on a frozen timetable',
        passed: frozen.ok && isDeepStrictEqual(frozen.value, [600, 690, 780]),
        message: frozen.ok
          ? 'For a frozen copy of harbourTour at 10:00 the result was wrong. Check the order first.'
          : 'nextDepartures threw for a frozen array, which means it tried to change the array it was given.',
        output: show(frozen)
      }
    ])
  },

  test(t) {
    return t.judgeTest({
      test: 'src/departures.test.js',
      target: 'src/departures.js',
      wrong: 'grader/variants/sort-in-place.js',
      wrongLabel: 'a fix that sorts numbers correctly but still in place'
    })
  }
}

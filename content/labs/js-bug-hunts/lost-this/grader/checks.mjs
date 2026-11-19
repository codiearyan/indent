import { isDeepStrictEqual } from 'node:util'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
const clear = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))
const lost = /undefined/

export const checks = {
  async reproduce(t) {
    const dir = await t.sandbox({ 'src/fleet.js': t.chapterPath('starter/src/fleet.js') })
    const r = await t.call(dir, 'src/reproduce.js', 'reproduceLostThis')
    if (!r.ok) {
      return [
        {
          name: 'reproduceLostThis returns a result',
          passed: false,
          message: 'reproduceLostThis threw instead of returning { freeBoatsError, scannerError }. Catch each error and keep its message.',
          output: r.error
        }
      ]
    }
    const { freeBoatsError, scannerError } = r.value ?? {}
    return clear([
      {
        name: 'freeBoatsError is the message from freeBoats()',
        passed: typeof freeBoatsError === 'string' && lost.test(freeBoatsError),
        message: 'freeBoatsError should be the message of the TypeError that fleet.freeBoats() throws, as a string.',
        output: show(r)
      },
      {
        name: 'scannerError is the message from the scanner',
        passed: typeof scannerError === 'string' && lost.test(scannerError),
        message: "scannerError should be the message of the TypeError thrown by scan('out', 'K1') after connectScanner, as a string.",
        output: show(r)
      }
    ])
  },

  async fix(t) {
    const dir = await t.sandbox({
      'src/dock.js': t.chapterPath('starter/src/dock.js'),
      '.grader/drive.mjs': t.chapterPath('grader/drive.mjs')
    })
    const names = ['freeBoats', 'scanner', 'detached', 'twoFleets', 'alreadyOut']
    const runs = await Promise.all(names.map((name) => t.call(dir, '.grader/drive.mjs', name)))
    const [free, scan, detached, two, again] = runs.map((r) => (r.ok ? r.value : { error: r.error }))
    const out = (x) => JSON.stringify(x, null, 2)
    return clear([
      {
        name: 'freeBoats lists the boats that are not out',
        passed: isDeepStrictEqual(free.value, ['K1', 'P1']),
        message: 'With K2 and P2 checked out, freeBoats() should give K1 and P1. Look at what this is inside isFree when filter calls it.',
        output: out(free)
      },
      {
        name: 'The dock scanner checks boats out and in',
        passed: isDeepStrictEqual(scan.value, ['K1', 'K2']),
        message: 'connectScanner hands fleet.checkOut and fleet.checkIn to the scanner as plain functions. When the scanner calls them, they must still change this fleet.',
        output: out(scan)
      },
      {
        name: 'Methods work when taken off the fleet',
        passed: isDeepStrictEqual(detached.value, [false, true, true]),
        message: 'const { checkOut, checkIn, isFree } = fleet, then calling them directly, should still work on that fleet.',
        output: out(detached)
      },
      {
        name: 'Every fleet keeps its own boats',
        passed: isDeepStrictEqual(two.value, { harbour: ['K2'], beach: ['K1'] }),
        message: 'checkOut taken off each of two fleets should check a boat out of that fleet only. Each method must stay tied to the fleet it came from.',
        output: out(two)
      },
      {
        name: 'Checking out a boat twice is still an error',
        passed: typeof again.error === 'string' && /already out/.test(again.error),
        message: 'checkOut should still throw an error saying the boat is already out.',
        output: out(again)
      }
    ])
  },

  test(t) {
    return t.judgeTest({
      test: 'src/fleet.test.js',
      target: 'src/fleet.js',
      wrong: 'grader/variants/fix-free-boats-only.js',
      wrongLabel: 'a fix that only repairs freeBoats'
    })
  }
}

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
const clear = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))

export const checks = {
  async reproduce(t) {
    const dir = await t.sandbox({ 'src/sync.js': t.chapterPath('starter/src/sync.js') })
    const r = await t.call(dir, 'src/reproduce.js', 'reproduceEarlyReturn')
    if (!r.ok) {
      return [
        {
          name: 'reproduceEarlyReturn returns a result',
          passed: false,
          message: 'reproduceEarlyReturn threw instead of returning { returned, savedWhenReturned, savedLater }. Read the error.',
          output: r.error
        }
      ]
    }
    const { returned, savedWhenReturned, savedLater } = r.value ?? {}
    return clear([
      {
        name: 'returned is what syncBookings resolved with',
        passed: returned === 3,
        message: 'returned should be the value you get from await syncBookings(evening, store).',
        output: show(r)
      },
      {
        name: 'Nothing was saved when syncBookings returned',
        passed: savedWhenReturned === 0,
        message: 'savedWhenReturned should be store.saved().length read right after the await, before any waiting.',
        output: show(r)
      },
      {
        name: 'Everything was saved later',
        passed: savedLater === 3,
        message: 'savedLater should be store.saved().length after waiting about 100 ms, for example with a promise around setTimeout.',
        output: show(r)
      }
    ])
  },

  async fix(t) {
    const dir = await t.sandbox({
      'src/store.js': t.chapterPath('starter/src/store.js'),
      '.grader/drive.mjs': t.chapterPath('grader/drive.mjs')
    })
    const run = (...args) => t.call(dir, '.grader/drive.mjs', 'run', args)
    const [three, many, none, failing] = await Promise.all([run(3), run(8), run(0), run(4, ['b3'])])
    const v = (r) => (r.ok ? r.value : {})
    return clear([
      {
        name: 'Every booking is saved when syncBookings resolves',
        passed: v(three).savedWhenDone === 3 && v(many).savedWhenDone === 8,
        message: 'When the await on syncBookings finished, the store did not hold every booking yet. Something inside is not waited for.',
        output: `3 bookings: ${show(three)}\n8 bookings: ${show(many)}`
      },
      {
        name: 'Resolves with the number saved',
        passed: v(three).returned === 3 && v(many).returned === 8,
        message: 'syncBookings should resolve with how many bookings it saved.',
        output: show(three)
      },
      {
        name: 'An empty list resolves with 0',
        passed: v(none).returned === 0 && !v(none).error,
        message: 'With no bookings, syncBookings should resolve with 0.',
        output: show(none)
      },
      {
        name: 'A failing save makes syncBookings reject',
        passed: /Could not save b3/.test(v(failing).error ?? ''),
        message: 'When the save of b3 fails, the caller should be able to catch that error from await syncBookings(...). It resolved instead.',
        output: show(failing)
      },
      {
        name: 'No error escapes unhandled',
        passed: [three, many, none, failing].every((r) => r.ok && r.value.escaped.length === 0),
        message: 'A save error was rejected in a promise nobody was waiting on, so it escaped as an unhandled rejection.',
        output: show(failing)
      }
    ])
  },

  test(t) {
    return t.judgeTest({
      test: 'src/sync.test.js',
      target: 'src/sync.js',
      wrong: 'grader/variants/await-foreach.js',
      wrongLabel: 'a fix that puts await in front of forEach'
    })
  }
}

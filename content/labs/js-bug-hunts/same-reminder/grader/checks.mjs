import { isDeepStrictEqual } from 'node:util'
import { saturday } from '../starter/src/bookings.js'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
const clear = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))
const textFor = (b) => ({ to: b.phone, text: `Hi ${b.name}, your ${b.boat} is ready at ${b.time}.` })

const sunday = [
  { name: 'Lucas', phone: '+44 7700 900404', boat: 'canoe', time: '11:00', remindInMs: 20 },
  { name: 'Mei', phone: '+44 7700 900505', boat: 'paddleboard', time: '11:15', remindInMs: 10 },
  { name: 'Ola', phone: '+44 7700 900606', boat: 'double kayak', time: '12:00', remindInMs: 40 },
  { name: 'Ren', phone: '+44 7700 900707', boat: 'single kayak', time: '12:30', remindInMs: 5 }
]

export const checks = {
  async reproduce(t) {
    const dir = await t.sandbox({ 'src/reminders.js': t.chapterPath('starter/src/reminders.js') })
    const r = await t.call(dir, 'src/reproduce.js', 'reproduceSameReminder')
    if (!r.ok) {
      return [
        {
          name: 'reproduceSameReminder returns a result',
          passed: false,
          message: 'reproduceSameReminder threw instead of returning the texts that were sent. Read the error.',
          output: r.error
        }
      ]
    }
    const sent = Array.isArray(r.value) ? r.value : []
    const last = textFor(saturday[saturday.length - 1])
    return clear([
      {
        name: 'Returns one text per booking',
        passed: sent.length === saturday.length,
        message: `Expected ${saturday.length} texts, one per Saturday booking. Did you run every saved timer callback before returning?`,
        output: show(r)
      },
      {
        name: 'Every text went to the last customer',
        passed: sent.length > 0 && sent.every((s) => isDeepStrictEqual(s, last)),
        message: 'Each entry should be { to, text } exactly as send received them. With the original code they all look the same.',
        output: show(r)
      }
    ])
  },

  async fix(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const drive = (name, ...args) => t.call(dir, '.grader/drive.mjs', name, args)
    const [sat, sun, emptied, real] = await Promise.all([
      drive('fake', saturday),
      drive('fake', sunday),
      drive('fake', sunday, { emptyAfter: true }),
      drive('real', saturday)
    ])
    const v = (r) => (r.ok ? r.value : {})
    return clear([
      {
        name: 'Each Saturday customer gets their own text',
        passed: isDeepStrictEqual(v(sat).sent, saturday.map(textFor)),
        message: 'When the timers fired, the texts did not match their bookings. Which booking does each callback read when it finally runs?',
        output: show(sat)
      },
      {
        name: 'Works for a longer list too',
        passed: isDeepStrictEqual(v(sun).sent, sunday.map(textFor)),
        message: 'With four Sunday bookings the texts were wrong. Each callback needs its own booking.',
        output: show(sun)
      },
      {
        name: 'Nothing is sent before the timers fire',
        passed: v(sat).sentBeforeFire === 0,
        message: 'Texts went out while the reminders were being scheduled. setTimer needs a function to call later, not the result of calling send now.',
        output: show(sat)
      },
      {
        name: 'Each timer waits remindInMs',
        passed: isDeepStrictEqual(v(sun).delays, sunday.map((b) => b.remindInMs)),
        message: 'Each setTimer call should get that booking\'s remindInMs as its delay.',
        output: show(sun)
      },
      {
        name: 'Returns how many reminders were scheduled',
        passed: v(sat).count === 3 && v(sun).count === 4,
        message: 'scheduleReminders should return the number of reminders it scheduled.',
        output: `Saturday: ${v(sat).count}, Sunday: ${v(sun).count}`
      },
      {
        name: 'Still right when the caller empties its array',
        passed: isDeepStrictEqual(v(emptied).sent, sunday.map(textFor)),
        message: 'The caller emptied its bookings array right after scheduling, and the texts came out wrong. Each callback should hold on to its own booking instead of looking it up again when it fires.',
        output: show(emptied)
      },
      {
        name: 'Works with real timers',
        passed: isDeepStrictEqual(real.ok ? real.value : null, saturday.map(textFor)),
        message: 'With the default setTimeout the texts were wrong or did not arrive.',
        output: show(real)
      }
    ])
  },

  test(t) {
    return t.judgeTest({
      test: 'src/reminders.test.js',
      target: 'src/reminders.js',
      wrong: 'grader/variants/build-text-now.js',
      wrongLabel: 'a fix that sends each text right away'
    })
  }
}

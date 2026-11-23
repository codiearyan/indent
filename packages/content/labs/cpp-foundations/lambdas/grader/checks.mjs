import { callPut, judgeRule, num } from '../../grading.mjs'

const FILE = 'src/timer.cpp'
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const near = (got, key, want) => got[key] !== undefined && Math.abs(Number(got[key]) - want) < 1e-9
const base = { files: [FILE], counted: true, own: ['Repair'] }
// The shape of what a function takes, read by Check; what it gives back is a lambda, which has no name to compare.
const takes = (fn) => `indent_::fs7_<decltype(&${fn})>::say("takes");`
const takesProblem = (got, fn, want, what) => {
  const params = (got.takes ?? '').split('\x1f').slice(1)
  if (got.takes === 'overloaded') return `${fn} is written more than once, so Check cannot tell which one the task means. Keep one ${fn}.`
  if (params.length !== 1) return `${fn} takes ${params.length} values, and the task gives it one: ${what}.`
  if (params[0] !== want) return `${fn} takes ${what} as ${params[0] === 'Repair' ? 'a copy, a Repair' : params[0]}, and the task asks for ${want === 'Repair&' ? 'a reference, Repair&, to the caller\'s own repair' : 'a reference to a const Repair, which reads the caller\'s own without copying it'}.`
  return null
}

export const checks = {
  hours(t) {
    const values = [
      [90, 1.5],
      [45, 0.75],
      [600, 10],
      [0, 0],
      [7, 7 / 60]
    ]
    return judgeRule(t, {
      ...base,
      counted: false,
      task: 1,
      writes: ['hoursOf'],
      cases: [
        {
          name: 'hoursOf holds a lambda that gives back a double',
          code: `${put('lam', 'indent8_::lambda_<decltype(hoursOf)>() ? 1 : 0')} ${put('dbl', 'std::is_same_v<decltype(hoursOf(90)), double> ? 1 : 0')} ${put('void', 'std::is_void_v<decltype(hoursOf(90))> ? 1 : 0')}`,
          judge: (got) =>
            num(got, 'void') === 1
              ? 'The lambda in hoursOf gives back nothing: its result type is void. A lambda with a body in braces gives back only what a return in it gives back, and printing is not giving back.'
              : num(got, 'lam') !== 1
              ? 'hoursOf is a function written out with a name, and the task asks for a variable that holds a lambda: a function with no name of its own, written where it is used, with square brackets in front.'
              : num(got, 'dbl') !== 1
                ? 'The lambda in hoursOf gives back a whole number, not a double. Its result type is worked out from what its return gives back: minutes / 60 divides two ints, and the fraction of an hour is lost before anything else happens.'
                : null
        },
        ...values.map(([minutes, hours]) => ({
          name: `hoursOf(${minutes})`,
          code: callPut('h', 'hoursOf', minutes),
          judge: (got) => (got.hVoid ? 'hoursOf gives back nothing.' : near(got, 'h', hours) ? null : `hoursOf(${minutes}) gave back ${got.h}. ${minutes} minutes are ${minutes} sixtieths of an hour.`),
          output: (got) => `hoursOf(${minutes}) gave back ${got.h ?? '?'}`
        }))
      ]
    })
  },

  quote(t) {
    const make = (ticket, minutes) => `Repair r(${ticket}, "carriage clock"); r.addMinutes(${minutes});`
    return judgeRule(t, {
      ...base,
      task: 2,
      writes: ['quoteFor'],
      say: {
        dead: 'The quote read a repair that had ended. The lambda quoteFor gave back refers to a repair, and that repair was gone when Check asked for the price: a capture by reference keeps no copy of its own, so it outlives nothing. A quote keeps its word by keeping what it needs in the lambda itself.'
      },
      cases: [
        {
          name: 'quoteFor takes a const Repair&',
          code: takes('quoteFor'),
          judge: (got) => takesProblem(got, 'quoteFor', 'const Repair&', 'the repair')
        },
        {
          name: 'A quote of 90 minutes at 37.5 an hour, asked twice',
          code: `${make(4417, 90)} auto q = quoteFor(r); indent8_::scrub_(); ${put('a', 'q(37.5)')} ${put('b', 'q(37.5)')} ${put('dbl', 'std::is_same_v<decltype(q(37.5)), double> ? 1 : 0')}`,
          judge: (got) => {
            if (num(got, 'dbl') !== 1) return 'The lambda quoteFor gives back does not give back a double. Its result type is worked out from what its return gives back.'
            if (Math.abs(Number(got.a)) > 1e6 || Math.abs(Number(got.b)) > 1e6 || !near(got, 'a', Number(got.b))) return `The quote came to numbers that have nothing to do with the repair. The lambda read a variable of quoteFor that had ended when quoteFor returned: a capture by reference keeps no copy of its own. A quote keeps its word by keeping what it needs in the lambda itself.`
            if (!near(got, 'a', 56.25)) return `A repair of 90 minutes, quoted at 37.5 an hour, came to ${got.a}. The price is the minutes in hours, times the rate.`
            if (!near(got, 'b', 56.25)) return `Asked twice for the same quote, the lambda gave back ${got.a} and then ${got.b}. A quote changes nothing when it is asked.`
            return null
          },
          output: (got) => `A repair of 90 minutes: quote(37.5) gave back ${got.a ?? '?'}, then ${got.b ?? '?'}`
        },
        {
          name: 'The quote keeps its word when more minutes are logged',
          code: `${make(52, 60)} auto q = quoteFor(r); ${put('a', 'q(40.0)')} r.addMinutes(30); indent8_::scrub_(); ${put('b', 'q(40.0)')}`,
          judge: (got) => {
            if (!near(got, 'a', 40)) return `A repair of 60 minutes, quoted at 40 an hour, came to ${got.a}.`
            if (near(got, 'b', 60)) return 'After Check logged 30 more minutes on its repair, the same quote went up from 40 to 60: the lambda sees Check\'s repair as it is now. It refers to the repair instead of keeping what it had when it was made. The task asks for a quote that keeps its word.'
            if (!near(got, 'b', 40)) return `After Check logged 30 more minutes on its repair, the quote came to ${got.b}, and it was 40 before. A quote keeps the minutes the repair had when it was made.`
            return null
          },
          output: (got) => `A repair of 60 minutes: quote(40) gave back ${got.a ?? '?'}; after 30 more minutes were logged on the repair, ${got.b ?? '?'}`
        },
        {
          name: 'The quote keeps its word after the repair has ended',
          code: `auto q = [] { ${make(7, 45)} return quoteFor(r); }(); indent8_::scrub_(); ${put('c', 'q(20.0)')} indent8_::scrub_(); ${put('d', 'q(80.0)')}`,
          judge: (got) =>
            near(got, 'c', 15) && near(got, 'd', 60)
              ? null
              : `Once the repair of 45 minutes had ended, its quote came to ${got.c} at 20 an hour and ${got.d} at 80, not 15 and 60. What the lambda captures has to outlive the repair, so it keeps a copy of what it needs.`,
          output: (got) => `A repair of 45 minutes, ended before the quote was asked: quote(20) gave back ${got.c ?? '?'}, quote(80) gave back ${got.d ?? '?'}`
        }
      ]
    })
  },

  log(t) {
    return judgeRule(t, {
      ...base,
      task: 3,
      writes: ['logInto'],
      cases: [
        {
          name: 'logInto takes a Repair&',
          code: takes('logInto'),
          judge: (got) => takesProblem(got, 'logInto', 'Repair&', 'the repair')
        },
        {
          name: 'The timer logs on Check\'s own repair, and sees what Check logs itself',
          code: `Repair r(3110, "wall clock"); auto log = logInto(r); indent8_::scrub_(); ${callPut('a', 'log', 15)} ${callPut('b', 'log', 30)} ${put('m1', 'r.getMinutes()')} r.addMinutes(100); ${callPut('c', 'log', 5)} ${put('m', 'r.getMinutes()')} ${put('int', 'std::is_same_v<decltype(log(5)), int> ? 1 : 0')}`,
          judge: (got) => {
            if (got.aVoid) return 'The lambda logInto gives back logs the minutes and gives back nothing: its result type is void. The task asks it to give back the repair\'s minutes after it has logged, with a return.'
            if (num(got, 'int') !== 1) return 'The lambda logInto gives back does not give back an int. It gives back the repair\'s minutes, which getMinutes gives as an int.'
            if (num(got, 'm1') === 0 && num(got, 'b') === 45) return 'The timer logged 15 and 30 minutes and said 45, but Check\'s own repair still has 0 minutes. The lambda changed a copy of the repair that belongs to it, not the caller\'s repair. The task asks for that same repair to change.'
            if (num(got, 'm1') !== 45) return `After the timer logged 15 and then 30 minutes, Check's repair has ${got.m1} minutes. Each call adds its minutes to the repair, once.`
            if (num(got, 'a') !== 15 || num(got, 'b') !== 45) return `The timer gave back ${got.a} and ${got.b} after logging 15 and then 30 minutes. It gives back the repair's minutes after it has logged.`
            if (num(got, 'c') !== 150) return `Check logged 100 minutes on its repair itself, then the timer logged 5 and gave back ${got.c}, where the repair has 150. The lambda sees the caller's repair as it is now, every time.`
            return null
          },
          output: (got) => `A repair of 0 minutes: log(15) gave back ${got.a ?? '?'}, log(30) gave back ${got.b ?? '?'}, and the repair had ${got.m1 ?? '?'} minutes\nafter Check logged 100 itself, log(5) gave back ${got.c ?? '?'}, and the repair had ${got.m ?? '?'}`
        },
        {
          name: 'Two timers on two repairs keep apart',
          code: `Repair a(61, "lantern clock"); Repair b(62, "ship clock"); auto la = logInto(a); auto lb = logInto(b); indent8_::scrub_(); la(20); lb(45); la(10); ${put('a', 'a.getMinutes()')} ${put('b', 'b.getMinutes()')}`,
          judge: (got) => (num(got, 'a') === 30 && num(got, 'b') === 45 ? null : `Two timers, one per repair, logged 20 and 10 minutes on the first and 45 on the second, and the repairs have ${got.a} and ${got.b} minutes. Each timer logs on the repair it was made for.`),
          output: (got) => `After logging 20 and 10 on repair 61 and 45 on repair 62: ${got.a ?? '?'} and ${got.b ?? '?'} minutes`
        }
      ]
    })
  }
}

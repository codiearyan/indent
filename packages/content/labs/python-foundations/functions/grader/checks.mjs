import { aKind, callCases, fail, pass } from '../../grading.mjs'

const FILE = 'radio_tools.py'

const text = (value) => ({ type: 'str', value })
const number = (value) => ({ type: 'int', value })

/** The words for a value given back that is not text, or `otherwise`. */
const notText = (fn, otherwise) => (v) =>
  v.type === 'tuple'
    ? `${fn} gives back several values with commas between them, not one text. Commas separate the values print shows, but after return they make a group of values. Build one text, for example with an f-string.`
    : v.type !== 'str'
      ? `${fn} gives back ${aKind(v.type)}, not text.`
      : typeof otherwise === 'function'
        ? otherwise(v)
        : otherwise

/** Hours until `charge` is below `low`; with `atMark`, until it is at `low` or below. */
function hoursLeft(charge, drain, low, atMark = false) {
  let hours = 0
  while (atMark ? charge > low : charge >= low) {
    charge -= drain
    hours += 1
  }
  return hours
}

// Check's own clean_call_sign and crew_text, so that Task 4 is judged by itself. Each takes its
// one value in order or by any name, since a learner may name it as in their own def line.
const one = (name) => `
def _one_value_${name}(args, kwargs):
    values = list(args) + list(kwargs.values())
    if len(values) != 1:
        raise TypeError("${name}() takes 1 positional argument but %d were given" % len(values))
    return values[0]
`
const EARLIER = `${one('clean_call_sign')}${one('crew_text')}
def clean_call_sign(*args, **kwargs):
    return _one_value_clean_call_sign(args, kwargs).strip().upper()

def crew_text(*args, **kwargs):
    crew = _one_value_crew_text(args, kwargs)
    if crew == 0:
        return "no crew"
    if crew == 1:
        return "1 crew member"
    return f"{crew} crew members"
`
// Versions that give back words no right log line has, to see that log_line uses what they give.
const SIGN = 'SIGN FROM CLEAN CALL SIGN'
const CREW = 'CREW FROM CREW TEXT'
const MARKED = `${one('clean_call_sign')}${one('crew_text')}
def clean_call_sign(*args, **kwargs):
    _one_value_clean_call_sign(args, kwargs)
    return "${SIGN}"

def crew_text(*args, **kwargs):
    _one_value_crew_text(args, kwargs)
    return "${CREW}"
`

export const checks = {
  clean(t) {
    const list = [
      ['Spaces at both ends', '  alpha one ', 'ALPHA ONE'],
      ['No spaces around it', 'Charlie three', 'CHARLIE THREE'],
      ['Already in capitals', 'DELTA ', 'DELTA'],
      ['A number in it', ' echo 4', 'ECHO 4']
    ]
    return callCases(t, {
      file: FILE,
      task: 1,
      fn: 'clean_call_sign',
      typed:
        'clean_call_sign gives back the same call sign whatever Check gives it. It uses something other than its own parameter, such as call_sign from the top of the file or a call sign typed in. Build what it gives back from the name in its def line.',
      list: list.map(([name, heard, clean]) => ({
        name,
        args: [heard],
        expected: text(clean),
        hint: notText('clean_call_sign', (v) =>
          v.value === heard.trim()
            ? 'clean_call_sign gives back the call sign without its spaces, but not in capitals.'
            : v.value === heard.toUpperCase()
              ? 'clean_call_sign gives back the call sign in capitals, but the spaces at its start or end are still there.'
              : 'clean_call_sign does not give back the call sign without the spaces at its ends, in capitals.'
        )
      }))
    })
  },

  crew(t) {
    const list = [
      ['No crew', 0, 'no crew'],
      ['One crew member', 1, '1 crew member'],
      ['Two crew', 2, '2 crew members'],
      ['A big team', 11, '11 crew members']
    ]
    return callCases(t, {
      file: FILE,
      task: 2,
      fn: 'crew_text',
      typed:
        'crew_text gives back the same text whatever number Check gives it. Build what it gives back from its own parameter, the name in its def line.',
      list: list.map(([name, crew, words]) => ({
        name,
        args: [crew],
        expected: text(words),
        hint: notText(
          'crew_text',
          crew === 0
            ? 'With no crew at all, crew_text should give back the words the task gives for 0, not a number.'
            : crew === 1
              ? 'With one crew member, crew_text should give back the words the task gives for 1: one member, no s at the end.'
              : (v) =>
                  /^\d+ crew members$/.test(v.value)
                    ? `crew_text gives back a number of crew that is not the one Check gave it. Build the text from its own parameter.`
                    : `With ${crew} crew, crew_text should give back the number, a space and the words crew members. Compare it with the task, space by space.`
        )
      }))
    })
  },

  battery(t) {
    const list = [
      ['A full battery', [90, 25, 10]],
      ['A battery that lands exactly on the mark', [100, 20, 20]],
      ['A slow drain', [60, 7, 5]],
      ['A battery already below the mark', [30, 10, 50]]
    ]
    return callCases(t, {
      file: FILE,
      task: 3,
      fn: 'battery_hours',
      typed:
        'battery_hours gives back the same number whatever radio Check gives it. It uses something other than its own parameters, such as battery from the top of the file or a number typed in. Count with the names in its def line.',
      list: list.map(([name, args]) => {
        const want = hoursLeft(...args)
        const [charge, drain, low] = args
        const otherOrders = [
          [drain, charge, low],
          [charge, low, drain],
          [low, drain, charge],
          [drain, low, charge],
          [low, charge, drain]
        ].map((order) => hoursLeft(...order))
        return {
          name,
          args,
          expected: number(want),
          hint: (v) =>
            v.type !== 'int'
              ? `battery_hours gives back ${aKind(v.type)}, not a whole number of hours.`
              : v.value === 1 && want > 1 && otherOrders.includes(1)
                ? 'battery_hours gives back 1. Either a return inside the loop ends the function on the first round, or the def line takes its values in another order than Check gives them: the charge, the drain per hour, then the low mark.'
                : v.value === 1 && want > 1
                ? 'battery_hours gives back 1: it returns after the first hour. return ends the whole function at once, so a return inside the loop stops it on the first round. Give the hours back after the loop.'
                : otherOrders.includes(v.value)
                ? 'battery_hours counts as if its values came in another order. Check gives them as the task says: the charge, the drain per hour, then the low mark, and the def line takes them in that order.'
                : v.value === hoursLeft(...args, true) && v.value !== want
                  ? 'The charge lands exactly on the low mark here, and that is not below it yet, so the radio runs one more hour. Look at the condition of your loop.'
                  : 'battery_hours does not give back the hours until the charge is below the low mark. Work this case out by hand, hour by hour, and check the order of the parameters: charge, drain, low mark.'
        }
      })
    })
  },

  async log(t) {
    const list = [
      ['Several crew', ['  alpha one ', 3], 'ALPHA ONE: 3 crew members out'],
      ['One crew member', ['charlie', 1], 'CHARLIE: 1 crew member out'],
      ['No crew', [' delta 4', 0], 'DELTA 4: no crew out']
    ]
    const details = await callCases(t, {
      file: FILE,
      task: 4,
      fn: 'log_line',
      define: EARLIER,
      typed:
        'log_line gives back the same line whatever Check gives it. Build it from its own parameters, the names in its def line.',
      list: list.map(([name, args, line]) => ({
        name,
        args,
        expected: text(line),
        hint: notText(
          'log_line',
          'log_line does not give back the line the task shows: the tidy call sign, a colon and a space, the crew in words, then a space and out. Compare it with the task, space by space.'
        )
      }))
    })
    if (!details.every((d) => d.passed)) return details
    const [marked] = await callCases(t, {
      file: FILE,
      task: 4,
      fn: 'log_line',
      define: MARKED,
      list: [{ name: 'Builds on clean_call_sign and crew_text', args: ['  alpha one ', 3], expected: text('') }]
    })
    const got = /^It gave back: (.*)$/m.exec(marked.output ?? '')?.[1] ?? ''
    const missing = [
      !got.includes(SIGN) && 'clean_call_sign',
      !got.includes(CREW) && 'crew_text'
    ].filter(Boolean)
    const name = 'Builds on clean_call_sign and crew_text'
    return [
      ...details,
      !/^It gave back:/m.test(marked.output ?? '')
        ? { ...marked, name }
        : missing.length
          ? fail(
              name,
              `log_line gives back the right line, but does not build it from what ${missing.join(' and ')} ${missing.length > 1 ? 'give' : 'gives'} back. Call ${missing.length > 1 ? 'them' : 'it'} inside log_line and use what comes back, so that a change to either function shows in every log line.`
            )
          : pass(name)
    ]
  }
}

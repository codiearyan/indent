import { aKind, callCases, fail, partCode, pass } from '../../grading.mjs'

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

// Check's own clean_call_sign and crew_text, so that Task 4 is judged by itself.
const EARLIER = `
def clean_call_sign(heard):
    return heard.strip().upper()

def crew_text(crew):
    if crew == 0:
        return "no crew"
    if crew == 1:
        return "1 crew member"
    return f"{crew} crew members"
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
        return {
          name,
          args,
          expected: number(want),
          hint: (v) =>
            v.type !== 'int'
              ? `battery_hours gives back ${aKind(v.type)}, not a whole number of hours.`
              : v.value === 1 && want > 1
                ? 'battery_hours gives back 1: it returns after the first hour. return ends the whole function at once, so a return inside the loop stops it on the first round. Give the hours back after the loop.'
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
    const code = await partCode(t, FILE, 4)
    const uses = /\bclean_call_sign\s*\(/.test(code) && /\bcrew_text\s*\(/.test(code)
    return [
      ...details,
      uses
        ? pass('Builds on clean_call_sign and crew_text')
        : fail(
            'Builds on clean_call_sign and crew_text',
            'log_line gives back the right line, but builds it without calling clean_call_sign and crew_text. Call them inside log_line, so that a change to either one shows in every log line.'
          )
    ]
  }
}

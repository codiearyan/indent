import { calls, partOf, readSource, shape } from '../../rules-grading.mjs'

const FILE = 'src/callbacks.js'

const loaded = (details) => ![`${FILE} runs`, 'Every call finishes'].includes(details[0].name)

export const checks = {
  async wrap(t) {
    const details = await calls(t, {
      file: FILE,
      fn: 'addWrapping',
      list: [1000, 0, 2499].map((cents) => ({
        name: `Wraps a price of ${cents}`,
        expr: `addWrapping(${cents})`,
        expected: cents + 350,
        hint: 'addWrapping still returns cents plus 350, written the short way.'
      }))
    })
    if (!loaded(details)) return details
    const part = partOf(await readSource(t, FILE), 'addWrapping')
    const arrow = /^const\s+addWrapping\s*=/.test(part) && /=>/.test(part)
    for (const d of details) {
      if (/gives nothing back yet/.test(d.message ?? '') && /=>\s*\{/.test(part)) {
        d.message =
          'addWrapping gives nothing back. An arrow function with braces after => needs return, like any function; without braces, the value after => is given back by itself.'
      }
    }
    return [
      ...details,
      shape(
        'Is an arrow function kept in a const',
        arrow,
        'addWrapping is still written the long way. Keep it in a const with the same name, with the parameter in round brackets, then =>, then what it gives back.'
      )
    ]
  },

  rule(t) {
    const notARule = (v) =>
      v.type === 'function'
        ? v.name === 'weekendRule' || v.name === 'weekdayRule'
          ? undefined
          : 'ruleFor gave back a new function. Hand back weekendRule or weekdayRule themselves, by their names.'
        : v.type === 'string' && /Rule$/.test(v.value)
          ? 'ruleFor gave back text with the rule\'s name in it. Use the name without quotes to hand back the function itself.'
          : `ruleFor gave back ${v.type === 'NaN' ? 'NaN' : `a ${v.type}`}, not a rule. With round brackets after its name a rule runs and you get a price; without them you hand over the function itself.`
    return calls(t, {
      file: FILE,
      fn: 'ruleFor',
      list: [
        ['Saturday', 'weekendRule'],
        ['Sunday', 'weekendRule'],
        ['Monday', 'weekdayRule'],
        ['Friday', 'weekdayRule']
      ].map(([day, fn]) => ({
        name: `${day} gets the ${fn === 'weekendRule' ? 'weekend' : 'weekday'} rule`,
        expr: `ruleFor('${day}')`,
        expected: { fn },
        hint:
          fn === 'weekendRule'
            ? `${day} is a weekend day, so ruleFor should give back weekendRule. Both weekend days count, and day is compared letter by letter, capital letter included.`
            : `${day} is a weekday, so ruleFor should give back weekdayRule.`,
        explain: notARule
      }))
    })
  },

  apply(t) {
    return calls(t, {
      file: FILE,
      fn: 'applyRule',
      list: [
        [1000, '(cents) => cents - 250', 750],
        [999, '(cents) => cents * 2', 1998],
        [1500, '() => 0', 0],
        [640, '(cents) => cents + 1', 641]
      ].map(([price, rule, expected]) => ({
        name: `Applies ${rule} to ${price}`,
        expr: `applyRule(${price}, ${rule})`,
        expected,
        hint: 'applyRule should call the rule it is given with the price, and give back what the rule gives back.',
        explain: (v) =>
          v.type === 'function'
            ? 'applyRule gave back the rule itself. Call it, with round brackets and the price inside them, and give back its answer.'
            : v.value === price
              ? 'applyRule gave back the price unchanged, so the rule was never used. Call rule with the price.'
              : v.type === 'NaN'
                ? 'applyRule gave NaN. Check that rule is called with the price between its round brackets.'
                : undefined
      }))
    })
  },

  count(t) {
    return calls(t, {
      file: FILE,
      fn: 'countWhere',
      list: [
        ['banana', `(character) => character === 'a'`, 3],
        ['Fig and tea', `(character) => character === ' '`, 2],
        ['Wick', `(character) => character === character.toUpperCase()`, 1],
        ['abc', '() => false', 0],
        ['', '() => true', 0]
      ].map(([text, test, expected]) => ({
        name: `Counts in '${text}' with ${test}`,
        expr: `countWhere('${text}', ${test})`,
        expected,
        hint: 'Go through every character of text, call test with it, and count one each time test gives back true.',
        explain: (v) =>
          v.value === text.length && expected !== text.length
            ? 'countWhere counted every character, so the answer of test is not used. Call test with each character and count only when it gives back true.'
            : v.value === 0 && expected > 0
              ? 'countWhere counted nothing. Check that test is called with the character, and that the count goes up when it gives back true.'
              : undefined
      }))
    })
  }
}

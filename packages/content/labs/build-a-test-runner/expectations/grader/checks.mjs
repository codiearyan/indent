import { runCases } from '../../checks-helpers.mjs'

const said = (v) => (v.threw ? `threw ${v.error}` : 'did not throw')
const quiet = (v) => !v.threw
const failsWithBoth = (v) => v.threw && v.isError && v.inOrder

// Names what went wrong: no throw, a crash instead of the method's own Error, or a message that
// does not show both values.
const whyNot = (method, caseHint) => (v) => {
  if (!v || !v.threw) return caseHint
  if (!v.isError || v.errorName !== 'Error') {
    return `${method} threw ${v.error} instead of an Error of its own. ${caseHint}`
  }
  return `${method} threw, but its message does not show both values the way the task asks: the expected value, then the one it got, each written with inspect(). Compare your message with the output below.`
}

function holds(name, method, pair, setup) {
  return {
    name,
    run: 'compareCase',
    args: [method, pair],
    pass: quiet,
    show: said,
    setup,
    hint: `${method} should return quietly here, because the two values count as equal.`
  }
}

function breaks(name, method, pair, setup, hint) {
  return {
    name,
    run: 'compareCase',
    args: [method, pair],
    pass: failsWithBoth,
    show: (v) => `${said(v)}\nthe message should show ${v.wanted[0]}, then ${v.wanted[1]}`,
    setup,
    hint: whyNot(method, hint)
  }
}

export const checks = {
  'to-be'(t) {
    return runCases(t, 'toBe', [
      holds('Equal numbers pass', 'toBe', 'sameNumber', 'expect(4500).toBe(4500)'),
      breaks('Different numbers fail', 'toBe', 'otherNumber', 'expect(4050).toBe(4500)', 'Two different numbers should make toBe throw.'),
      breaks(
        'Text is not a number',
        'toBe',
        'textAndNumber',
        "expect('5').toBe(5)",
        "The string '5' and the number 5 are different values. Look at how you compare them, and at whether a reader of your message could tell them apart."
      ),
      holds('NaN is the same as NaN', 'toBe', 'nan', 'expect(NaN).toBe(NaN)'),
      breaks(
        'Two objects that look alike are not the same object',
        'toBe',
        'twinObjects',
        'expect({ colours: 2 }).toBe({ colours: 2 })',
        'toBe asks whether both are the very same value. Two separate objects are never that, even when they look alike.'
      ),
      holds('An object is the same as itself', 'toBe', 'sameObject', 'const job = { colours: 2 }; expect(job).toBe(job)')
    ])
  },

  'to-equal'(t) {
    const breaksEqual = (name, pair, setup, hint) => breaks(name, 'toEqual', pair, setup, hint)
    return runCases(t, 'toEqual', [
      holds('Equal objects pass', 'toEqual', 'nested', "two separate copies of { item: 'invite', sizes: [105, 148], ink: { colour: 'oxblood', passes: 2 } }"),
      holds('Key order does not matter', 'toEqual', 'keyOrder', 'expect({ setup: 1500, total: 4500 }).toEqual({ total: 4500, setup: 1500 })'),
      holds('Equal arrays pass', 'toEqual', 'arrays', 'expect([1, [2, 3]]).toEqual([1, [2, 3]])'),
      holds('NaN inside an array', 'toEqual', 'nanInArray', 'expect([NaN]).toEqual([NaN])'),
      breaksEqual('A difference deep inside fails', 'nestedDiff', 'expect({ ink: { passes: 2 } }).toEqual({ ink: { passes: 3 } })', 'The difference is one level down. Compare the values inside, not only the top.'),
      breaksEqual('An extra key fails', 'extraKey', 'expect({ setup: 1500, total: 4500 }).toEqual({ setup: 1500 })', 'The value has a key that the expected object does not.'),
      breaksEqual('A missing key fails', 'missingKey', 'expect({ setup: 1500 }).toEqual({ setup: 1500, total: 4500 })', 'The expected object has a key that the value lacks. Look at both sets of keys.'),
      breaksEqual('Different keys fail even when both are undefined', 'undefinedKeys', 'expect({ a: undefined }).toEqual({ b: undefined })', 'Both objects have one key, but not the same key. Reading a key that is not there also gives undefined.'),
      breaksEqual('Order matters in an array', 'order', 'expect([1, 2]).toEqual([2, 1])', 'An array is equal only when the same values sit at the same places.'),
      breaksEqual('An array is not an object', 'arrayVsObject', 'expect([]).toEqual({})', 'An array never equals an object that is not an array.'),
      breaksEqual('null is not an object', 'nullVsObject', 'expect(null).toEqual({})', 'typeof null is "object", but null is not an object with keys.'),
      breaksEqual('NaN is not null', 'nanVsNull', 'expect([NaN]).toEqual([null])', 'NaN and null are different values. Turning both sides into text can hide that.'),
      breaksEqual('Text is not a number', 'textVsNumber', "expect('3').toEqual(3)", "Values that are not objects compare the way toBe does, so '3' is not 3.")
    ])
  },

  'to-throw'(t) {
    const throwCase = (name, args, pass, setup, hint, show) => ({ name, run: 'throwCase', args, pass, setup, hint, show: show ?? said })
    const withBoth = (v) => `${said(v)}\nthe message should show ${v.wanted[0]}, then ${v.wanted[1]}`
    return runCases(t, 'toThrow', [
      throwCase('Passes when the function throws', ['unknownItem'], (v) => !v.threw && v.calls === 1, "expect(fn).toThrow(), where fn throws Error('Unknown item: mug')", 'toThrow should call the function once and return quietly when it throws.', (v) => `${said(v)}, called the function ${v.calls} times`),
      throwCase(
        'Fails when the function returns',
        ['returns'],
        (v) => v.threw && v.isError && v.message?.includes('Expected the function to throw') && v.calls === 1,
        'expect(fn).toThrow(), where fn returns 4500',
        (v) =>
          v?.threw && v.calls !== 1
            ? 'toThrow should call the function once, and only once.'
            : 'A function that returns has not thrown, so toThrow should throw the Error from the task. If you do throw there, check whether your own catch swallows it.',
        (v) => `${said(v)}, called the function ${v.calls} times`
      ),
      throwCase('Any thrown value counts', ['text'], (v) => !v.threw, "expect(fn).toThrow(), where fn throws the string 'no paper left'", 'A function that throws a string has still thrown.'),
      throwCase('A thrown undefined counts', ['nothing'], (v) => !v.threw, 'expect(fn).toThrow(), where fn runs `throw undefined`', 'The function threw, even though the value is undefined. Decide by whether your catch ran, not by what it caught.'),
      throwCase('Passes when the message has the text', ['unknownItem', 'Unknown item'], (v) => !v.threw, "expect(fn).toThrow('Unknown item'), where fn throws Error('Unknown item: mug')", "The error's message contains the text, so toThrow should return quietly."),
      throwCase(
        'Fails when the message is different',
        ['priceMissing', 'Unknown item'],
        failsWithBoth,
        "expect(fn).toThrow('Unknown item'), where fn throws Error('Price missing')",
        whyNot('toThrow', "The function threw, but its message does not contain the text, so toThrow should fail."),
        withBoth
      ),
      throwCase(
        'Fails when the function returns, with a text',
        ['returns', 'Unknown item'],
        (v) => v.threw && v.isError && v.message?.includes('Expected the function to throw'),
        "expect(fn).toThrow('Unknown item'), where fn returns 4500",
        'With or without a text, a function that returns has not thrown.'
      )
    ])
  }
}

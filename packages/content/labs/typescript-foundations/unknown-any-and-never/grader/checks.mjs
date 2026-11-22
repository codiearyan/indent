import { call, code, judge } from '../../grading.mjs'

const FILE = 'src/cafe.ts'

const stops = (fn, args, hint) => ({
  ...call(fn, args, undefined, hint),
  name: `${fn}(${args.map(code).join(', ')}) stops with an error`,
  throws: true
})

export const checks = {
  tin(t) {
    return judge(t, {
      file: FILE,
      task: 1,
      results: ['tinLine'],
      uses: 'grader/types/tin.uses.ts',
      misuse: 'grader/types/tin.misuse.ts',
      messages: {
        uses: "Check's own code passes tinLine a tin and uses its line as text, and the compiler refuses it. The parameter should be a Tin from the top of the file, and the result text. The output says which use.",
        misuse:
          "Check's own code passes tinLine something that is not a tin, or uses its line as a number, and the compiler lets it through. The parameter should be a Tin from the top of the file, and the result text."
      },
      cases: [
        call(
          'tinLine',
          [{ blend: 'Smoky Lapsang', grams: 100 }],
          'Smoky Lapsang, 100 g',
          'tinLine should give the blend, a comma, a space, the grams and g. If you see undefined, a property name in the body does not match the tin.'
        ),
        call(
          'tinLine',
          [{ blend: 'Hearth Assam', grams: 500 }],
          'Hearth Assam, 500 g',
          'tinLine should give the blend, a comma, a space, the grams and g, for any tin.'
        )
      ]
    })
  },

  tins(t) {
    const other =
      'For anything that is neither a number nor text, tinsFrom should give 0. Number() turns some of those into a number too, so check the type before you convert.'
    return judge(t, {
      file: FILE,
      task: 2,
      results: ['tinsFrom'],
      nonNull: true,
      uses: 'grader/types/tins.uses.ts',
      misuse: 'grader/types/tins.misuse.ts',
      messages: {
        uses: "Check's own code passes tinsFrom whatever a till might send (a number, text, null, undefined, a list), and the compiler refuses one of them. The parameter should accept any value at all, and still be checked before it is used."
      },
      cases: [
        call('tinsFrom', [6], 6, 'For a number, tinsFrom should give that number.'),
        call(
          'tinsFrom',
          ['12'],
          12,
          'For text, tinsFrom should give the number the text holds, as a number, not as text.'
        ),
        call('tinsFrom', [null], 0, other),
        call('tinsFrom', [true], 0, other),
        call('tinsFrom', [[4]], 0, other)
      ]
    })
  },

  order(t) {
    const nothing = (here) =>
      `${here} For anything but an object with a blend that is text and tins that are a number, readOrder should give null.`
    return judge(t, {
      file: FILE,
      task: 3,
      results: ['readOrder'],
      nonNull: true,
      uses: 'grader/types/order.uses.ts',
      misuse: 'grader/types/order.misuse.ts',
      messages: {
        uses: "Check's own code passes readOrder whatever JSON.parse might make, and the compiler refuses one of them. Leave the first line of the function as the starter wrote it.",
        misuse:
          "Check's own code uses what readOrder gives back without checking for null, or reads a property an order does not have, and the compiler lets it through. Leave the first line of the function as the starter wrote it."
      },
      cases: [
        call(
          'readOrder',
          [{ blend: 'Morning Keemun', tins: 3 }],
          { blend: 'Morning Keemun', tins: 3 },
          'For an object with a blend that is text and tins that are a number, readOrder should give back an order with that blend and those tins.'
        ),
        call(
          'readOrder',
          [{ blend: 'Morning Keemun', tins: '3' }],
          null,
          nothing('Here the tins are text, not a number.')
        ),
        call(
          'readOrder',
          [{ blend: 7, tins: 3 }],
          null,
          nothing('Here the blend is a number, not text.')
        ),
        call('readOrder', [{ tins: 3 }], null, nothing('Here the blend is missing.')),
        call(
          'readOrder',
          [null],
          null,
          nothing('Here the value is null, which typeof calls an object too.')
        ),
        call(
          'readOrder',
          ['Morning Keemun'],
          null,
          nothing('Here the value is text, not an object.')
        ),
        call('readOrder', [[]], null, nothing('Here the value is an empty list.'))
      ]
    })
  },

  status(t) {
    return judge(t, {
      file: FILE,
      task: 4,
      results: ['notHandled', 'statusLine'],
      uses: 'grader/types/status.uses.ts',
      misuse: 'grader/types/status.misuse.ts',
      messages: {
        misuse:
          "Check's own code passes notHandled a real status, passes statusLine a status the cafe does not have, or uses a line as a number, and the compiler lets it through. The output says which. notHandled should take only what is left once every kind is handled."
      },
      grow: {
        type: 'CafeStatus',
        member: "'refunded'",
        name: 'A new status is refused until it is handled',
        message:
          'Check added a fourth status to CafeStatus, and statusLine still compiles, so an order with the new status would get no line of its own. Hand what is left in the default to notHandled, whose parameter takes nothing at all.'
      },
      cases: [
        call(
          'statusLine',
          ['new'],
          'Waiting for payment',
          'statusLine should give the same lines as before for the three statuses. Change only the default.'
        ),
        call(
          'statusLine',
          ['sent'],
          'On its way',
          'statusLine should give the same lines as before for the three statuses. Change only the default.'
        ),
        stops(
          'statusLine',
          ['lost'],
          'A status that slipped in from outside should reach the default and stop the code with an error, not give a line. Make the default hand it to notHandled.'
        ),
        stops(
          'notHandled',
          ['lost'],
          'notHandled should throw an Error, so the code stops there instead of going on.'
        )
      ]
    })
  }
}

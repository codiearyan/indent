import { call, judge } from '../../grading.mjs'

const FILE = 'src/lists.ts'
const RUNNER = 'grader/run.mjs'

export const checks = {
  first(t) {
    return judge(t, {
      file: FILE,
      task: 1,
      runner: RUNNER,
      results: ['firstOf'],
      uses: 'grader/types/first.uses.ts',
      misuse: 'grader/types/first.misuse.ts',
      messages: {
        uses: "Check's own code takes the first of lists of text, numbers and orders, and uses each as its own type, and the compiler refuses one of them. What firstOf gives back should keep the type of the items it was given, for any list. The output says which use.",
        misuse:
          "Check's own code uses the first of a list as a type it is not, or as never undefined, and the compiler lets it through. What firstOf gives back should be exactly the type of the items, or undefined. The output says which use."
      },
      cases: [
        call(
          'firstOf',
          [['Morning Keemun', 'Smoky Lapsang']],
          'Morning Keemun',
          'firstOf should give back the first item of the list. Leave the body as the starter wrote it.'
        ),
        call(
          'firstOf',
          [[500, 100]],
          500,
          'firstOf should give back the first item, for any list.'
        ),
        {
          name: 'firstOf([]) gives undefined',
          call: 'firstOf',
          run: 'firstOfNone',
          setup: 'firstOf([]) === undefined',
          expected: true,
          hint: 'For an empty list, firstOf should give back undefined.'
        }
      ]
    })
  },

  byid(t) {
    const orders = [
      { id: 'OK-3001', tins: 2 },
      { id: 'OK-3002', tins: 6 },
      { id: 'OK-3002', tins: 9 }
    ]
    return judge(t, {
      file: FILE,
      task: 2,
      runner: RUNNER,
      results: ['byId'],
      uses: 'grader/types/byid.uses.ts',
      misuse: 'grader/types/byid.misuse.ts',
      messages: {
        uses: "Check's own code finds an order and a customer with byId, and reads a property only that kind has, and the compiler refuses it. What byId gives back should keep every property of what the list holds, not only the id. The output says which use.",
        misuse:
          "Check's own code passes byId things without a text id, or reads a property the list's things do not have, and the compiler lets it through. The output says which use."
      },
      cases: [
        call(
          'byId',
          [orders, 'OK-3002'],
          { id: 'OK-3002', tins: 6 },
          'byId should give back the first thing in the list whose id is the one given.'
        ),
        call(
          'byId',
          [[{ id: 'C-12', name: 'Ottoline Marsh' }], 'C-12'],
          { id: 'C-12', name: 'Ottoline Marsh' },
          'byId should give back the whole thing it found, every property included.'
        ),
        {
          name: 'byId gives undefined when nothing has the id',
          call: 'byId',
          run: 'byIdNone',
          setup: "byId([{ id: 'OK-3001', tins: 1 }], 'OK-9999') === undefined",
          expected: true,
          hint: 'When nothing in the list has the id, byId should give back undefined.'
        }
      ]
    })
  },

  result(t) {
    return judge(t, {
      file: FILE,
      task: 3,
      results: ['parseTins', 'parseBlend'],
      declared: { Result: 'type' },
      uses: 'grader/types/result.uses.ts',
      misuse: 'grader/types/result.misuse.ts',
      messages: {
        uses: "Check's own code uses Result with numbers, text and true or false, and tells the two shapes apart by ok, and the compiler refuses it. The output says which use.",
        misuse:
          "Check's own code makes or reads a Result the wrong way, and the compiler lets it through. A Result is one of two shapes, told apart by ok being true or false, and its value has the type in the angle brackets. The output says which use."
      },
      cases: [
        call(
          'parseTins',
          ['12'],
          { ok: true, value: 12 },
          'parseTins should give back what the starter gave. Leave its body as it is.'
        ),
        call(
          'parseTins',
          ['many'],
          { ok: false, reason: 'many is not a number of tins' },
          'parseTins should give back what the starter gave. Leave its body as it is.'
        ),
        call(
          'parseBlend',
          [' Smoky Lapsang '],
          { ok: true, value: 'Smoky Lapsang' },
          'parseBlend should give back what the starter gave. Leave its body as it is.'
        )
      ]
    })
  },

  plain(t) {
    return judge(t, {
      file: FILE,
      task: 4,
      results: ['addGrams', 'tinTitle'],
      uses: 'grader/types/plain.uses.ts',
      misuse: 'grader/types/plain.misuse.ts',
      messages: {
        misuse:
          "Check's own code calls addGrams or tinTitle the wrong way, and the compiler lets it through. If the output shows a call with a type in angle brackets, the function still has a type parameter. The output says which use."
      },
      cases: [
        call(
          'addGrams',
          [500, 125],
          625,
          'addGrams should give the sum of the two weights. Leave its body as it is.'
        ),
        call(
          'tinTitle',
          ['Morning Keemun'],
          'Morning Keemun, loose leaf',
          'tinTitle should give the blend and ", loose leaf". Leave its body as it is.'
        )
      ]
    })
  }
}

import { call, judge } from '../../grading.mjs'

const FILE = 'src/offers.ts'
const RUNNER = 'grader/run.mjs'

/** A case that hands the learner's `fn` to Check's own code in run.mjs, which uses it as `setup` shows. */
const used = (fn, run, setup, expected, hint) => ({
  name: `${setup} gives the right answer`,
  call: fn,
  run,
  setup,
  expected,
  hint
})

export const checks = {
  labels(t) {
    return judge(t, {
      file: FILE,
      task: 1,
      runner: RUNNER,
      results: ['labelAll'],
      uses: 'grader/types/labels.uses.ts',
      misuse: 'grader/types/labels.misuse.ts',
      messages: {
        uses: "Check's own code passes labelAll a function from a blend to its label, and the compiler refuses it. format should take one blend as text and give back text. Leave the body as the starter wrote it.",
        misuse:
          "Check's own code passes labelAll something that is not a function from text to text, and the compiler lets it through. Write the type of format with what it takes and what it gives back."
      },
      cases: [
        used(
          'labelAll',
          'labelSamples',
          "labelAll(['Smoky Lapsang', 'Morning Keemun'], (blend) => `${blend} (sample)`)",
          ['Smoky Lapsang (sample)', 'Morning Keemun (sample)'],
          'labelAll should give back what format gives for each blend, in the same order. Leave the body as the starter wrote it.'
        ),
        used(
          'labelAll',
          'labelNone',
          'labelAll([], (blend) => blend)',
          [],
          'For no blends, labelAll should give back an empty list.'
        )
      ]
    })
  },

  rules(t) {
    return judge(t, {
      file: FILE,
      task: 2,
      runner: RUNNER,
      results: ['applyRules'],
      declared: { PriceRule: 'type' },
      named: [
        ['fridayOff', 'PriceRule'],
        ['applyRules', 'PriceRule']
      ],
      uses: 'grader/types/rules.uses.ts',
      misuse: 'grader/types/rules.misuse.ts',
      messages: {
        uses: "Check's own code makes price rules with PriceRule and passes a list of them to applyRules, and the compiler refuses it. A price rule takes a number of pence and gives back a number of pence. The output says which use.",
        misuse:
          "Check's own code passes a rule that is not from pence to pence, or one rule where a list goes, and the compiler lets it through. The output says which use."
      },
      cases: [
        call(
          'fridayOff',
          [2000],
          1800,
          'fridayOff should give the price less a tenth, rounded. Leave its body as the starter wrote it.'
        ),
        used(
          'applyRules',
          'rulesInOrder',
          'applyRules(1200, [(pence) => pence - 200, (pence) => pence * 2])',
          2000,
          'applyRules should apply each rule to the price the one before gave, in order. Leave its body as the starter wrote it.'
        ),
        used(
          'applyRules',
          'noRules',
          'applyRules(990, [])',
          990,
          'With no rules, applyRules should give back the price as it is.'
        )
      ]
    })
  },

  numbered(t) {
    return judge(t, {
      file: FILE,
      task: 3,
      runner: RUNNER,
      results: ['numbered'],
      nonNull: true,
      uses: 'grader/types/numbered.uses.ts',
      misuse: 'grader/types/numbered.misuse.ts',
      messages: {
        uses: "Check's own code passes numbered a callback that uses only the line, and one that uses the position as a number, and the compiler refuses one of them. The output says which. numbered always passes the position, so a callback can count on it.",
        misuse:
          "Check's own code passes numbered a callback that does not fit, and the compiler lets it through. format should take a line as text and a position as a number, and give back text. The output says which use."
      },
      cases: [
        used(
          'numbered',
          'positions',
          "numbered(['Frost Sencha', 'Hearth Assam', 'Ember Oolong'], (line, at) => `${at}:${line}`)",
          ['1:Frost Sencha', '2:Hearth Assam', '3:Ember Oolong'],
          'numbered should pass each line and its position counting from 1, and give back what format gives. Leave the body as the starter wrote it.'
        ),
        used(
          'numbered',
          'linesOnly',
          "numbered(['Morning Keemun'], (line) => `- ${line}`)",
          ['- Morning Keemun'],
          'numbered should give back what format gives for each line.'
        )
      ]
    })
  },

  offer(t) {
    const hint =
      'The rule percentOff gives back should take a price in pence and give back that price less the percent, rounded to a whole penny with Math.round.'
    return judge(t, {
      file: FILE,
      task: 4,
      runner: RUNNER,
      results: ['percentOff'],
      uses: 'grader/types/offer.uses.ts',
      misuse: 'grader/types/offer.misuse.ts',
      messages: {
        misuse:
          "Check's own code calls percentOff, or the rule it gives back, the wrong way, and the compiler lets it through. percentOff takes only a percent, and gives back a function from pence to pence. The output says which use.",
        uses: "Check's own code keeps what percentOff gives back as a function from pence to pence and calls it, and the compiler refuses it. percentOff takes a percent and gives back a function, so its result type is a function type. The output says which use."
      },
      cases: [
        used('percentOff', 'tenOff', 'percentOff(10)(2450)', 2205, hint),
        used('percentOff', 'quarterOff', 'percentOff(25)(999)', 749, hint),
        used(
          'percentOff',
          'twoRules',
          'const small = percentOff(5), large = percentOff(50); [small(1000), large(1000), small(2000)]',
          [950, 500, 1900],
          'Each rule percentOff gives back should keep its own percent, even after another rule is made.'
        )
      ]
    })
  }
}

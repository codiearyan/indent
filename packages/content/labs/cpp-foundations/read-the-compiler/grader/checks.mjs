import { fail, judge, line } from '../../grading.mjs'

const FILE = 'src/workbench.cpp'

const bench = (springsInStock, springsDelivered, handsPerClock, clocksOnBench, crystalMm, oilPerService) => ({
  springsInStock,
  springsDelivered,
  handsPerClock,
  clocksOnBench,
  crystalMm,
  oilPerService
})

const CASES = [
  bench(7, 12, 3, 4, 28.5, 0.4),
  bench(0, 25, 2, 9, 34.25, 1.25),
  bench(41, 6, 1, 7, 19, 2)
]

const keepsLine = (pattern, what) => (section) =>
  pattern.test(section.code)
    ? null
    : fail(
        'Keeps what Kasimir meant',
        `The line that ${what} is not as Kasimir wrote it any more. The compiler points at one mistake; fix that and keep the rest of the line. Undo your other changes.`
      )

export const checks = {
  springs(t) {
    return judge(t, {
      file: FILE,
      task: 1,
      vars: { springsOnShelf: 'int' },
      source: keepsLine(/springsInStock\s*\+\s*springsDelivered|springsDelivered\s*\+\s*springsInStock/, 'adds the springs'),
      typed:
        'Check changed the bench and springsOnShelf stayed the same. Keep it built from springsInStock and springsDelivered, as Kasimir wrote it.',
      cases: CASES.map((g) => ({
        name: `${g.springsInStock} springs in stock and ${g.springsDelivered} delivered`,
        given: g,
        expect: { springsOnShelf: g.springsInStock + g.springsDelivered },
        lines: [line(`Springs on the shelf: ${g.springsInStock + g.springsDelivered}`)],
        hint: 'The springs are not the stock plus the delivery here, or the line that prints them changed. Keep both lines as Kasimir wrote them, apart from the mistake.'
      }))
    })
  },

  hands(t) {
    return judge(t, {
      file: FILE,
      task: 2,
      vars: { handsNeeded: 'int' },
      source: keepsLine(/handsPerClock\s*\*\s*clocksOnBench|clocksOnBench\s*\*\s*handsPerClock/, 'works out the hands'),
      typed:
        'Check changed the bench and the hands to fit stayed the same. Print the variable Kasimir made, not a number you typed.',
      cases: CASES.map((g) => {
        const hands = g.handsPerClock * g.clocksOnBench
        return {
          name: `${g.handsPerClock} hands for each of ${g.clocksOnBench} clocks`,
          given: g,
          expect: { handsNeeded: hands },
          lines: [line(`Hands to fit: ${hands}`)],
          hint: ({ stdout }) =>
            /Hands to fit: 0\b/.test(stdout)
              ? 'The line prints 0 hands. A second variable with the misspelt name only hides the mistake: the line should print the variable made on the line above it.'
              : 'The line does not print the hands Kasimir worked out. It should print the variable made on the line above it, by its exact name.'
        }
      })
    })
  },

  crystal(t) {
    return judge(t, {
      file: FILE,
      task: 3,
      vars: { crystalSize: 'double' },
      typed:
        'Check changed the bench and the crystal stayed the same. Keep crystalSize built from crystalMm, not a number you typed.',
      cases: CASES.map((g) => ({
        name: `A crystal of ${g.crystalMm} mm`,
        given: g,
        expect: { crystalSize: g.crystalMm },
        lines: [line(`Crystal: ${g.crystalMm} mm`)],
        hint: ({ reads }) =>
          reads.crystalSize === Math.trunc(g.crystalMm)
            ? 'The crystal comes out without its decimals. A whole-number type cuts them off: pick the type that holds a number with a decimal point.'
            : 'crystalSize does not hold crystalMm here, or the line that prints it changed. Keep both lines as Kasimir wrote them, apart from the type.'
      }))
    })
  },

  oil(t) {
    return judge(t, {
      file: FILE,
      task: 4,
      source: keepsLine(/std::setprecision\s*\(\s*2\s*\)/, 'prints the oil'),
      typed: 'Check changed the bench and the oil stayed the same. Keep the line printing oilPerService.',
      storyLines: [line('Oil: 0.35 ml')],
      cases: CASES.map((g) => ({
        name: `${g.oilPerService} ml of oil, with two decimals`,
        given: g,
        lines: [line(`Oil: ${g.oilPerService.toFixed(2)} ml`)],
        hint: 'The oil line does not print the oil with exactly two decimals. Keep the line as Kasimir wrote it; what is missing is not on that line.'
      }))
    })
  }
}

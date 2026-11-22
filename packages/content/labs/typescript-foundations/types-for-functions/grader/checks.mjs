import { judge } from '../../grading.mjs'

const FILE = 'src/pricing.ts'

const call = (fn, args, expected, hint) => ({
  name: `${fn}(${args.map((a) => JSON.stringify(a).replaceAll('"', "'")).join(', ')}) gives the right answer`,
  call: fn,
  args,
  expected,
  setup: `${fn}(${args.map((a) => JSON.stringify(a).replaceAll('"', "'")).join(', ')})`,
  hint
})

export const checks = {
  price(t) {
    const hint = 'tinPrice should give the grams times the price per 100 g, divided by 100 and rounded. Leave its body as the starter wrote it.'
    return judge(t, {
      file: FILE,
      task: 1,
      results: ['tinPrice'],
      uses: 'grader/types/price.uses.ts',
      misuse: 'grader/types/price.misuse.ts',
      cases: [call('tinPrice', [250, 640], 1600, hint), call('tinPrice', [50, 1290], 645, hint)]
    })
  },

  label(t) {
    return judge(t, {
      file: FILE,
      task: 2,
      results: ['tinLabel'],
      uses: 'grader/types/label.uses.ts',
      misuse: 'grader/types/label.misuse.ts',
      messages: {
        uses: "Check calls tinLabel with a blend and grams, and with a blend alone, and the compiler refuses one of them. Look at which call the output shows: a call may leave the grams out, and a parameter is only allowed to be left out when the function says so."
      },
      cases: [
        call('tinLabel', ['Smoky Lapsang', 50], 'Smoky Lapsang, 50 g', 'tinLabel should give the blend, a comma, a space and the grams followed by g.'),
        call(
          'tinLabel',
          ['Morning Keemun'],
          'Morning Keemun, 100 g',
          'Called without the grams, tinLabel should label a tin of the usual size, 100 g. If you see undefined, the grams are missing and nothing takes their place.'
        )
      ]
    })
  },

  packed(t) {
    return judge(t, {
      file: FILE,
      task: 3,
      results: ['packedLine'],
      uses: 'grader/types/packed.uses.ts',
      misuse: 'grader/types/packed.misuse.ts',
      cases: [
        call(
          'packedLine',
          ['OK-2207', 4],
          'Packed 4 tins for OK-2207',
          'packedLine should give the line back to whoever called it, not only print it. Printing shows text in the terminal; giving back is what return does.'
        ),
        call('packedLine', ['OK-0090', 1], 'Packed 1 tins for OK-0090', 'packedLine should give back a line in the same shape for any order.')
      ]
    })
  },

  shipping(t) {
    const hint = (what) => `shippingFor should give ${what}. Compare your rules with the list in the comment, the edges included.`
    return judge(t, {
      file: FILE,
      task: 4,
      results: ['shippingFor'],
      uses: 'grader/types/shipping.uses.ts',
      misuse: 'grader/types/shipping.misuse.ts',
      cases: [
        call('shippingFor', [500, false], 295, hint('295 for an order of exactly 500 g')),
        call('shippingFor', [501, false], 450, hint('450 for an order just over 500 g')),
        call('shippingFor', [2000, true], 800, hint('450 plus 350 for an express order of exactly 2000 g')),
        call('shippingFor', [2001, false], 900, hint('900 for an order over 2000 g')),
        call('shippingFor', [120, true], 645, hint('295 plus 350 for a small express order'))
      ]
    })
  }
}

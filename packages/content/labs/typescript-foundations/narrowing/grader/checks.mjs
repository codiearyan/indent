import { call, judge } from '../../grading.mjs'

const FILE = 'src/packing.ts'

export const checks = {
  refs(t) {
    const number =
      "For a number, refLabel should give 'OK-' and the number with zeros in front of it to make four digits."
    const text =
      'For text, refLabel should give the text without spaces at either end, in capitals.'
    return judge(t, {
      file: FILE,
      task: 1,
      results: ['refLabel'],
      uses: 'grader/types/refs.uses.ts',
      misuse: 'grader/types/refs.misuse.ts',
      messages: {
        uses: "Check's own code passes refLabel a ref of each kind, and the compiler refuses one of them. Leave the first line of the function as the starter wrote it."
      },
      cases: [
        call('refLabel', [51], 'OK-0051', number),
        call('refLabel', [4410], 'OK-4410', number),
        call('refLabel', ['  ok-2210 '], 'OK-2210', text),
        call('refLabel', ['Ok-77'], 'OK-77', text)
      ]
    })
  },

  count(t) {
    const hint =
      'lineCount should give the tins of a tin line, and the number of blends in a sampler.'
    return judge(t, {
      file: FILE,
      task: 2,
      results: ['lineCount'],
      uses: 'grader/types/count.uses.ts',
      misuse: 'grader/types/count.misuse.ts',
      messages: {
        uses: "Check's own code passes lineCount a tin line and a sampler, and the compiler refuses one of them. Leave the first line of the function as the starter wrote it.",
        misuse:
          "Check's own code passes lineCount something that is neither a tin line nor a sampler, and the compiler lets it through. Leave the first line of the function as the starter wrote it, and check the shape inside the body instead."
      },
      cases: [
        call('lineCount', [{ blend: 'Frost Sencha', tins: 5 }], 5, hint),
        call('lineCount', [{ samples: ['Ember Oolong', 'Hearth Assam'] }], 2, hint),
        call('lineCount', [{ samples: [] }], 0, hint)
      ]
    })
  },

  shelf(t) {
    return judge(t, {
      file: FILE,
      task: 3,
      results: ['shelfLine'],
      uses: 'grader/types/shelf.uses.ts',
      misuse: 'grader/types/shelf.misuse.ts',
      messages: {
        uses: "Check's own code passes shelfLine a count and null, and the compiler refuses one of them. Leave the first line of the function as the starter wrote it.",
        misuse:
          "Check's own code passes shelfLine a count as text, or undefined, and the compiler lets it through. Leave the first line of the function as the starter wrote it."
      },
      cases: [
        call(
          'shelfLine',
          [null],
          'Not counted',
          "For null, shelfLine should give 'Not counted': nobody has counted that shelf yet."
        ),
        call(
          'shelfLine',
          [0],
          'Sold out',
          "For 0, shelfLine should give 'Sold out'. 0 is a count, so a check that treats every falsy value like null gives the wrong line here."
        ),
        call(
          'shelfLine',
          [7],
          '7 tins',
          "For a count above 0, shelfLine should give the count and ' tins'."
        ),
        call(
          'shelfLine',
          [1],
          '1 tins',
          "For a count above 0, shelfLine should give the count and ' tins', as the starter wrote it."
        )
      ]
    })
  },

  delivery(t) {
    return judge(t, {
      file: FILE,
      task: 4,
      results: ['deliveryLine'],
      uses: 'grader/types/delivery.uses.ts',
      misuse: 'grader/types/delivery.misuse.ts',
      grow: {
        type: 'Delivery',
        member: "{ kind: 'courier'; slot: string }",
        name: 'A new kind of delivery is refused until it is handled',
        message:
          'Check added a fourth kind to Delivery, and deliveryLine still compiles, so a parcel of the new kind would get a line nobody wrote for it. Handle each kind by its name, with nothing that catches every other kind, so the compiler can tell when one is missing.'
      },
      cases: [
        call(
          'deliveryLine',
          [{ kind: 'post', address: '12 Weir Road, Lowmarsh' }],
          'Post to 12 Weir Road, Lowmarsh',
          "For post, deliveryLine should give 'Post to ' and the address."
        ),
        call(
          'deliveryLine',
          [{ kind: 'locker', locker: 'L-04' }],
          'Locker L-04',
          "For a locker, deliveryLine should give 'Locker ' and the locker number."
        ),
        call(
          'deliveryLine',
          [{ kind: 'collect' }],
          'Collect at the shop',
          "For collect, deliveryLine should give 'Collect at the shop'."
        )
      ]
    })
  }
}

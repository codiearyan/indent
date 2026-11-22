import { judge } from '../../grading.mjs'

const FILE = 'src/order-sheet.ts'
const order = (o) => ({ id: 'OK-2071', blend: 'Morning Keemun', ...o })

export const checks = {
  shelf(t) {
    return judge(t, {
      file: FILE,
      task: 1,
      given: { delivered: 30 },
      uses: 'grader/types/shelf.uses.ts',
      misuse: 'grader/types/shelf.misuse.ts',
      annotated: ['tinsOnShelf'],
      cases: [
        {
          name: 'tinsOnShelf holds the count from the comment',
          read: 'tinsOnShelf',
          expected: 24,
          setup: 'tinsOnShelf',
          hint: 'tinsOnShelf should hold the number of tins the comment above it gives, as a number.'
        },
        {
          name: 'Adds a delivery to the tins',
          prints: 'Tins after the delivery:',
          expected: 54,
          setup: 'With delivered = 30',
          hint: 'The line should print the tins on the shelf plus the delivery, worked out from the two names: Check used another delivery. If the two numbers come out glued together like text, one of them is still text.'
        }
      ]
    })
  },

  grams(t) {
    return judge(t, {
      file: FILE,
      task: 2,
      given: { order: order({ tins: 4, gramsPerTin: 250, zone: 'national' }) },
      cases: [
        {
          name: 'Counts the grams in an order',
          prints: 'Grams in the order:',
          expected: 1000,
          setup: 'With an order of 4 tins of 250 g',
          hint: 'The line should multiply the tins of the order by the grams in each tin. NaN means one of the two was not a number: read the property names letter by letter.'
        }
      ]
    })
  },

  label(t) {
    return judge(t, {
      file: FILE,
      task: 3,
      given: { order: order({ tins: 2, gramsPerTin: 50, zone: 'local' }) },
      uses: 'grader/types/label.uses.ts',
      messages: {
        uses: 'Check calls tinLabel with a blend first and grams second, as its parameters say, and the compiler refuses it. Leave tinLabel as it was and change the call under Task 3.'
      },
      cases: [
        {
          name: 'Prints the label for a tin of the order',
          prints: 'Label:',
          expected: 'Morning Keemun, 50 g',
          setup: 'With an order of Morning Keemun in 50 g tins',
          hint: 'The label should read the blend, a comma and the grams. Compare the order of the values in the call with the order of the parameters of tinLabel.'
        }
      ]
    })
  },

  shipping(t) {
    return judge(t, {
      file: FILE,
      task: 4,
      given: { order: order({ tins: 6, gramsPerTin: 250, zone: 'national' }) },
      uses: 'grader/types/shipping.uses.ts',
      misuse: 'grader/types/shipping.misuse.ts',
      messages: {
        misuse:
          'Check calls shippingFor with a weight and no zone, and the compiler lets it through. shippingFor needs both to give the right price: leave it as it was and change the call under Task 4.'
      },
      cases: [
        {
          name: 'Prints the shipping for the order',
          prints: 'Shipping:',
          expected: 650,
          setup: 'With an order of 6 tins of 250 g to the national zone',
          hint: "The shipping should follow the order's weight and the order's own zone. Pass the zone from the order, not a word you typed."
        }
      ]
    })
  }
}

import { judge } from '../../grading.mjs'

const FILE = 'src/order-form.ts'

export const checks = {
  tin(t) {
    return judge(t, {
      file: FILE,
      task: 1,
      annotated: ['blendName', 'gramsInTin', 'caffeineFree'],
      uses: 'grader/types/tin.uses.ts',
      misuse: 'grader/types/tin.misuse.ts',
      messages: {
        uses: "Check's own code uses the three values of Task 1 as text, a number and true or false, and the compiler refuses it. Compare each type you wrote with what the value holds, and write type names in lowercase.",
        misuse:
          "Check's own code uses a value of Task 1 as a type it is not, and the compiler lets it through. A type you wrote is wider than the value it holds."
      }
    })
  },

  grams(t) {
    const given = (tins, each) => ({ formTins: tins, formGramsPerTin: each })
    return judge(t, {
      file: FILE,
      task: 2,
      given: given('7', '50'),
      annotated: ['tins', 'gramsPerTin', 'orderGrams'],
      uses: 'grader/types/grams.uses.ts',
      misuse: 'grader/types/grams.misuse.ts',
      cases: [
        {
          name: 'tins is a number made from the form',
          read: 'tins',
          expected: 7,
          setup: "With formTins = '7', tins",
          hint: "tins should be the number the form's text says, made from formTins. If it shows in quotes, it is still text."
        },
        {
          name: 'gramsPerTin is a number made from the form',
          read: 'gramsPerTin',
          expected: 50,
          setup: "With formGramsPerTin = '50', gramsPerTin",
          hint: "gramsPerTin should be the number the form's text says, made from formGramsPerTin."
        },
        {
          name: 'Counts the grams in the order',
          prints: 'Grams in the order:',
          expected: 350,
          setup: "With formTins = '7' and formGramsPerTin = '50'",
          hint: 'The line should print the tins times the grams per tin, worked out from the two names.'
        },
        {
          name: 'Counts the grams in another order',
          given: given('12', '250'),
          prints: 'Grams in the order:',
          expected: 3000,
          setup: "With formTins = '12' and formGramsPerTin = '250'",
          hint: 'The line should print the tins times the grams per tin for any order, worked out from the two names.'
        }
      ]
    })
  },

  gift(t) {
    const asks = (word, expected) => ({
      name: `isGift is ${expected} when the form says ${word === '' ? 'nothing' : word}`,
      given: { formGift: word },
      read: 'isGift',
      expected,
      setup: `With formGift = '${word}', isGift`,
      hint: `isGift should be true only when the form says exactly yes, and false for any other text. Any text that is not empty counts as true when JavaScript turns it into a boolean, so ask a question that compares it.`
    })
    return judge(t, {
      file: FILE,
      task: 3,
      given: { formGift: 'yes' },
      annotated: ['isGift'],
      uses: 'grader/types/gift.uses.ts',
      cases: [asks('yes', true), asks('no', false), asks('', false), asks('maybe', false)]
    })
  },

  delivery(t) {
    return judge(t, {
      file: FILE,
      task: 4,
      given: { deliveredTins: '30' },
      annotated: ['tinsAfterDelivery'],
      uses: 'grader/types/delivery.uses.ts',
      misuse: 'grader/types/delivery.misuse.ts',
      cases: [
        {
          name: 'Adds the delivery to the shelf',
          prints: 'Tins after the delivery:',
          expected: 70,
          setup: "With shelfTins = 40 and deliveredTins = '30'",
          hint: 'The line should print the tins on the shelf plus the tins delivered, as one number. If the two come out glued together, the delivery is still text when it is added: make it a number before the +, not after.'
        },
        {
          name: 'Adds another delivery to the shelf',
          given: { deliveredTins: '5' },
          prints: 'Tins after the delivery:',
          expected: 45,
          setup: "With shelfTins = 40 and deliveredTins = '5'",
          hint: 'The line should work for any delivery, worked out from deliveredTins.'
        }
      ]
    })
  }
}

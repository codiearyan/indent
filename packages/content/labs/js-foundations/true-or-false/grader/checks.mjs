import { cases } from '../../grading.mjs'

const FILE = 'src/booleans.js'

const order = (changes) => ({
  totalCents: 5400,
  freeShippingFromCents: 5000,
  deliveryZone: 'national',
  candlesInStock: 7,
  quantity: 3,
  shopClosed: false,
  giftNote: '',
  ...changes
})

export const checks = {
  big(t) {
    return cases(t, {
      file: FILE,
      name: 'bigOrder',
      task: 'Task 1',
      list: [
        {
          name: 'An order just under the line is not big',
          given: order({ totalCents: 4999, freeShippingFromCents: 5000 }),
          expected: false,
          hint: 'Compare totalCents with freeShippingFromCents. bigOrder should be true or false itself, not a number or text.'
        },
        {
          name: 'An order exactly on the line is big',
          given: order({ totalCents: 6000, freeShippingFromCents: 6000 }),
          expected: true,
          hint: 'The task says the amount itself counts: "or more". Which comparison includes the equal case?'
        },
        {
          name: 'A larger order is big',
          given: order({ totalCents: 8000, freeShippingFromCents: 6000 }),
          expected: true,
          hint: 'Check changed both numbers and bigOrder did not follow. Use the two names, not numbers you typed.'
        }
      ]
    })
  },

  free(t) {
    return cases(t, {
      file: FILE,
      name: 'freeShipping',
      task: 'Task 2',
      list: [
        {
          name: 'A small local order ships free',
          given: order({ totalCents: 1200, deliveryZone: 'local' }),
          expected: true,
          hint: 'A local order ships free even when it is small. Compare deliveryZone with the text for the local zone.'
        },
        {
          name: 'A small national order pays for shipping',
          given: order({ totalCents: 1200, deliveryZone: 'national' }),
          expected: false,
          hint: 'Neither rule holds here: the order is small and not local. Look at how you join the two rules.'
        },
        {
          name: 'A big order abroad ships free',
          given: order({ totalCents: 9000, deliveryZone: 'abroad' }),
          expected: true,
          hint: 'A big order ships free wherever it goes. Make sure Task 1 passes and that freeShipping uses it.'
        },
        {
          name: 'A small order abroad pays for shipping',
          given: order({ totalCents: 3000, deliveryZone: 'abroad' }),
          expected: false,
          hint: 'A small order outside the local zone pays for shipping. Look at how you join the two rules.'
        }
      ]
    })
  },

  today(t) {
    return cases(t, {
      file: FILE,
      name: 'canShipToday',
      task: 'Task 3',
      list: [
        {
          name: 'Ships when exactly enough candles are in stock',
          given: order({ candlesInStock: 2, quantity: 2, shopClosed: false }),
          expected: true,
          hint: 'Exactly enough candles is enough: "at least as many". Which comparison includes the equal case?'
        },
        {
          name: 'Does not ship when stock is short',
          given: order({ candlesInStock: 1, quantity: 2, shopClosed: false }),
          expected: false,
          hint: 'With fewer candles in stock than the order needs, it cannot ship. Compare candlesInStock with quantity.'
        },
        {
          name: 'Does not ship when the shop is closed',
          given: order({ candlesInStock: 10, quantity: 2, shopClosed: true }),
          expected: false,
          hint: 'Plenty of stock, but the shop is closed. Both rules must hold. How do you turn shopClosed around?'
        },
        {
          name: 'Does not ship when both rules fail',
          given: order({ candlesInStock: 0, quantity: 1, shopClosed: true }),
          expected: false,
          hint: 'Nothing in stock and the shop is closed. Look at how you join the two rules.'
        }
      ]
    })
  },

  note(t) {
    return cases(t, {
      file: FILE,
      name: 'hasGiftNote',
      task: 'Task 4',
      list: [
        {
          name: 'No note gives false',
          given: order({ giftNote: '' }),
          expected: false,
          hint: 'An empty note is no note at all. hasGiftNote must be true or false itself, not the note.'
        },
        {
          name: 'A note gives true',
          given: order({ giftNote: 'Happy birthday, Sam' }),
          expected: true,
          hint: 'A note with words in it is a note. hasGiftNote must be true or false itself, not the note.'
        },
        {
          name: 'A one-letter note gives true',
          given: order({ giftNote: 'x' }),
          expected: true,
          hint: 'Even a very short note counts. The lesson shows how to turn any value into true or false.'
        }
      ]
    })
  }
}

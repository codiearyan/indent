import { code, source } from '../../grading.mjs'
import { decide } from '../../rules-grading.mjs'

const FILE = 'src/decisions.js'

const order = (changes) => ({
  totalCents: 4200,
  deliveryZone: 'national',
  candlesInStock: 8,
  quantity: 3,
  hourNow: 11,
  ...changes
})

const decided = (t, options) => decide(t, { file: FILE, ...options })

export const checks = {
  stock(t) {
    return decided(t, {
      name: 'stockNote',
      task: 'Task 1',
      list: [
        {
          name: 'No candles at all is running low',
          given: order({ candlesInStock: 0 }),
          expected: 'Running low',
          hint: 'With nothing in stock, stockNote should be the low stock text from the task, spelt exactly.'
        },
        {
          name: 'Four candles is running low',
          given: order({ candlesInStock: 4 }),
          expected: 'Running low',
          hint: 'Four is fewer than five, so the if part should run. Look at the condition in your if.'
        },
        {
          name: 'Exactly five candles is plenty',
          given: order({ candlesInStock: 5 }),
          expected: 'Plenty on the shelf',
          hint: 'Five is not fewer than five, so the else part should run. Which comparison leaves out the equal case?'
        },
        {
          name: 'Twelve candles is plenty',
          given: order({ candlesInStock: 12 }),
          expected: 'Plenty on the shelf',
          hint: 'With plenty in stock, stockNote should be the text from the task for the else part, spelt exactly.'
        }
      ]
    })
  },

  shipping(t) {
    return decided(t, {
      name: 'shippingCents',
      task: 'Task 2',
      list: [
        {
          name: 'A big order abroad ships free',
          given: order({ totalCents: 6100, deliveryZone: 'abroad' }),
          expected: 0,
          hint: 'A big order ships free wherever it goes. Only the first true condition runs, so the question about the total has to come before the questions about the zone.'
        },
        {
          name: 'A big local order ships free',
          given: order({ totalCents: 5600, deliveryZone: 'local' }),
          expected: 0,
          hint: 'A big order ships free, local ones too. Only the first true condition runs, so the question about the total has to come before the questions about the zone.'
        },
        {
          name: 'An order of exactly 5000 ships free',
          given: order({ totalCents: 5000, deliveryZone: 'national' }),
          expected: 0,
          hint: 'The task says 5000 cents or more. Which comparison includes the equal case?'
        },
        {
          name: 'A small local order pays 250',
          given: order({ totalCents: 1800, deliveryZone: 'local' }),
          expected: 250,
          hint: 'A small local order should get the local price. Compare deliveryZone with the text for the local zone, using ===.'
        },
        {
          name: 'A small national order pays 495',
          given: order({ totalCents: 1800, deliveryZone: 'national' }),
          expected: 495,
          hint: 'A small national order should get the national price. Look at the else if for the national zone.'
        },
        {
          name: 'A small order abroad pays 1295',
          given: order({ totalCents: 4999, deliveryZone: 'abroad' }),
          expected: 1295,
          hint: 'An order that is small and neither local nor national should reach the last part, the else.'
        }
      ]
    })
  },

  word(t) {
    return decided(t, {
      name: 'candleWord',
      task: 'Task 3',
      list: [
        {
          name: 'One candle',
          given: order({ quantity: 1 }),
          expected: 'candle',
          hint: 'For exactly one, candleWord should be the single word from the task.'
        },
        {
          name: 'Two candles',
          given: order({ quantity: 2 }),
          expected: 'candles',
          hint: 'For two, candleWord should be the word with an s.'
        },
        {
          name: 'Zero candles',
          given: order({ quantity: 0 }),
          expected: 'candles',
          hint: 'The shop says 0 candles. Only a quantity of exactly 1 takes the single word, so ask whether quantity is the same as 1.'
        },
        {
          name: 'Twelve candles',
          given: order({ quantity: 12 }),
          expected: 'candles',
          hint: 'For twelve, candleWord should be the word with an s.'
        }
      ]
    }).then(async (details) => {
      if (details.some((d) => d.name === `${FILE} runs` || d.name === 'candleWord is there')) {
        return details
      }
      const short = /\bcandleWord\s*=[^\n]*\?[^\n]*:/.test(code(await source(t, FILE)))
      return [
        ...details,
        {
          name: 'Uses the short form',
          passed: short,
          message: short
            ? undefined
            : 'The task asks for the short form: make candleWord in one line with a question, then ?, then one value, then :, then the other.'
        }
      ]
    })
  },

  when(t) {
    return decided(t, {
      name: 'shipsWhen',
      task: 'Task 4',
      list: [
        {
          name: 'Too few candles waits for a restock, even early',
          given: order({ candlesInStock: 1, quantity: 2, hourNow: 9 }),
          expected: 'When restocked',
          hint: 'There are fewer candles than the order needs, so it waits for a restock whatever the time. Only the first true condition runs: ask about the stock first.'
        },
        {
          name: 'Exactly enough candles at 13 ships today',
          given: order({ candlesInStock: 2, quantity: 2, hourNow: 13 }),
          expected: 'Today',
          hint: 'Exactly enough candles is enough. Look at the comparison of candlesInStock with quantity, then at the hour.'
        },
        {
          name: 'At 14 it ships tomorrow',
          given: order({ candlesInStock: 10, quantity: 2, hourNow: 14 }),
          expected: 'Tomorrow',
          hint: 'The task says an hour before 14 ships today, so 14 itself does not. Which comparison leaves out the equal case?'
        },
        {
          name: 'Late in the day it ships tomorrow',
          given: order({ candlesInStock: 10, quantity: 2, hourNow: 20 }),
          expected: 'Tomorrow',
          hint: 'In stock but late in the day, shipsWhen should be the text for the else part, spelt exactly.'
        }
      ]
    })
  }
}

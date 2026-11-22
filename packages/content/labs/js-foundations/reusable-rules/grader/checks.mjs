import { code } from '../../grading.mjs'
import { calls, evaluate, partOf, readSource, shape } from '../../rules-grading.mjs'

const FILE = 'src/functions.js'

const loaded = (details) => ![`${FILE} runs`, 'Every call finishes'].includes(details[0].name)

const gramsFirst = (grams) => (v) =>
  v.type === 'string' && v.value.startsWith(String(grams))
    ? 'The grams came first. Check calls candleLabel with the scent first and the grams second, so the parameters go in that order too.'
    : undefined

export const checks = {
  label(t) {
    return calls(t, {
      file: FILE,
      fn: 'candleLabel',
      list: [
        {
          name: 'Labels a fig candle',
          expr: `candleLabel('Fig', 450)`,
          expected: 'Fig candle, 450 g',
          hint: 'Build the label from the two values candleLabel is given: the scent, the word candle, a comma, the grams and g, with the spaces of the example in the task.',
          explain: gramsFirst(450)
        },
        {
          name: 'Labels a smoked pine candle',
          expr: `candleLabel('Smoked pine', 120)`,
          expected: 'Smoked pine candle, 120 g',
          hint: 'Build the label from the two values candleLabel is given, with a template literal or with +.',
          explain: gramsFirst(120)
        },
        {
          name: 'Labels a large amber candle',
          expr: `candleLabel('Amber', 1000)`,
          expected: 'Amber candle, 1000 g',
          hint: 'Build the label from the two values candleLabel is given, with a template literal or with +.',
          explain: gramsFirst(1000)
        }
      ]
    })
  },

  async shipping(t) {
    const text = code(await readSource(t, FILE))
    const helper = partOf(text, 'zonePrice')
    if (!helper) {
      return [
        shape(
          'Writes zonePrice',
          false,
          'Check cannot find a function called zonePrice, spelt exactly so, capital P included. Write it yourself under // Task 2, at the left edge: the word function, the name zonePrice, its parameter in round brackets and its rules in curly braces.'
        )
      ]
    }
    const zone = await calls(t, {
      file: FILE,
      fn: 'zonePrice',
      list: [
        {
          name: 'zonePrice prices a local parcel',
          expr: `zonePrice('local')`,
          expected: 250,
          hint: 'For the local zone zonePrice gives the local price. Compare zone with the text for the local zone, using ===.'
        },
        {
          name: 'zonePrice prices a national parcel',
          expr: `zonePrice('national')`,
          expected: 495,
          hint: 'For the national zone zonePrice gives the national price. Look at the part for the national zone.'
        },
        {
          name: 'zonePrice prices a parcel abroad',
          expr: `zonePrice('abroad')`,
          expected: 1295,
          hint: 'A zone that is neither local nor national should reach the last return.'
        }
      ]
    })
    if (!loaded(zone)) return zone
    const shipping = await calls(t, {
      file: FILE,
      fn: 'shippingFor',
      list: [
        {
          name: 'A big order abroad ships free',
          expr: `shippingFor(5200, 'abroad')`,
          expected: 0,
          hint: 'A big order ships free wherever it goes. Only the first return that runs counts, so ask about the total before anything else.'
        },
        {
          name: 'A big local order ships free',
          expr: `shippingFor(5600, 'local')`,
          expected: 0,
          hint: 'A big order ships free, local ones too. Only the first return that runs counts, so ask about the total before anything else.'
        },
        {
          name: 'An order of exactly 5000 ships free',
          expr: `shippingFor(5000, 'national')`,
          expected: 0,
          hint: 'The task says 5000 cents or more. Which comparison includes the equal case?'
        },
        {
          name: 'A small local order pays 250',
          expr: `shippingFor(1800, 'local')`,
          expected: 250,
          hint: 'A small order pays what zonePrice gives for its zone. Hand zonePrice the zone shippingFor was given.'
        },
        {
          name: 'A small order abroad pays 1295',
          expr: `shippingFor(4999, 'abroad')`,
          expected: 1295,
          hint: 'A small order pays what zonePrice gives for its zone. Hand zonePrice the zone shippingFor was given.'
        }
      ]
    })
    const body = partOf(text, 'shippingFor')
    const exported = /^export\s*\{[^}]*\bzonePrice\b/m.test(text)
    return [
      ...zone,
      ...shipping,
      shape(
        'shippingFor calls zonePrice',
        /\bzonePrice\s*\(/.test(body),
        'The task asks shippingFor to use zonePrice for the zone instead of writing the zone prices again. Call zonePrice inside shippingFor.'
      ),
      shape(
        'zonePrice stays off the export line',
        !exported,
        'zonePrice only helps shippingFor, so it stays off the export line at the bottom. Put that line back as it was.'
      )
    ]
  },

  price(t) {
    return calls(t, {
      file: FILE,
      fn: 'priceFor',
      list: [
        {
          name: 'Prices three candles',
          expr: `priceFor(1250, 3)`,
          expected: 3750,
          hint: 'With a quantity, priceFor gives priceCents times quantity.'
        },
        {
          name: 'Prices two candles at another price',
          expr: `priceFor(900, 2)`,
          expected: 1800,
          hint: 'With a quantity, priceFor gives priceCents times quantity.'
        },
        {
          name: 'Without a quantity it counts one candle',
          expr: `priceFor(1400)`,
          expected: 1400,
          hint: 'When priceFor is called with one value, quantity is left out. The lesson shows how a parameter gets a value of its own for that case.',
          explain: (v) =>
            v.type === 'NaN'
              ? 'priceFor(1400) gave NaN. A parameter that is left out is undefined, and a number times undefined is NaN. Give quantity a default value.'
              : undefined
        },
        {
          name: 'A quantity of 0 costs nothing',
          expr: `priceFor(700, 0)`,
          expected: 0,
          hint: 'Zero candles cost 0. Only a quantity that is left out counts as one, so 0 must stay 0.',
          explain: (v) =>
            v.value === 700
              ? 'priceFor(700, 0) priced one candle, so 0 was treated like a missing quantity. || replaces every falsy value, 0 included; a default value steps in only when the quantity is left out.'
              : undefined
        }
      ]
    })
  },

  async total(t) {
    // orderTotal is built from Task 2 and Task 3, so those are probed first.
    const { results, problem } = await evaluate(t, FILE, [
      `shippingFor(3000, 'local') === 250 && shippingFor(3000, 'national') === 495 && shippingFor(3000, 'abroad') === 1295 && shippingFor(6000, 'abroad') === 0 && shippingFor(5600, 'local') === 0 && shippingFor(5000, 'national') === 0`,
      `priceFor(800, 4) === 3200`
    ])
    if (problem) return [problem]
    const broken = [
      results[0].result?.value !== true && 'shippingFor from Task 2',
      results[1].result?.value !== true && 'priceFor from Task 3'
    ].filter(Boolean)
    if (broken.length) {
      return [
        {
          name: 'Tasks 2 and 3 work',
          passed: false,
          message: `orderTotal is built from ${broken.join(' and ')}, which ${broken.length === 1 ? 'is' : 'are'} not right yet. Get ${broken.length === 1 ? 'that task' : 'those tasks'} to pass first, then check again.`
        }
      ]
    }
    const details = await calls(t, {
      file: FILE,
      fn: 'orderTotal',
      list: [
        {
          name: 'Two local candles',
          expr: `orderTotal(1250, 2, 'local')`,
          expected: 2750,
          hint: 'The total is the price of the candles plus the shipping for that price.'
        },
        {
          name: 'One national candle',
          expr: `orderTotal(900, 1, 'national')`,
          expected: 1395,
          hint: 'The total is the price of the candles plus the shipping for that price.'
        },
        {
          name: 'A big order abroad ships free',
          expr: `orderTotal(1000, 5, 'abroad')`,
          expected: 5000,
          hint: 'Shipping depends on the price of all the candles together, not on the price of one. Hand shippingFor the price that priceFor gives.'
        },
        {
          name: 'Two candles just under free shipping',
          expr: `orderTotal(2400, 2, 'abroad')`,
          expected: 6095,
          hint: 'Shipping depends on the price of all the candles together. Hand shippingFor the price that priceFor gives, and the zone.'
        }
      ]
    })
    const body = partOf(await readSource(t, FILE), 'orderTotal')
    return [
      ...details,
      shape(
        'Calls priceFor and shippingFor',
        /\bpriceFor\s*\(/.test(body) && /\bshippingFor\s*\(/.test(body),
        'The task asks orderTotal to call priceFor and shippingFor instead of writing their rules again. Call both inside orderTotal.'
      )
    ]
  }
}

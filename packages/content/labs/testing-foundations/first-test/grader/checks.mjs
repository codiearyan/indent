import { isDeepStrictEqual } from 'node:util'
import { block as inBlock, judge } from '../../grading.mjs'
import * as right from '../solution/src/prices.js'

const test = 'src/prices.test.js'
const target = 'src/prices.js'

const block = (title, wrong) => (t) =>
  judge(t, { test, target, ...inBlock(title), wrong })

/** Calls each function of the learner's prices.js and compares it with the right answer. */
async function compare(t, dir, calls) {
  const results = await Promise.all(calls.map(([fn, args]) => t.call(dir, target, fn, args)))
  return calls.map(([fn, args], i) => {
    const r = results[i]
    const shown = `${fn}(${args.map((a) => JSON.stringify(a)).join(', ')})`
    return {
      shown,
      ok: r.ok,
      error: r.error,
      value: r.value,
      same: r.ok && isDeepStrictEqual(r.value, right[fn](...args)),
      line: r.ok ? `${shown} gave ${JSON.stringify(r.value)}` : `${shown} threw: ${r.error}`
    }
  })
}

export const checks = {
  'small-box': block('boxPrice', [
    {
      label: 'charges a small box the large price',
      change: ['return BOX_PRICES[size]', "return size === 'small' ? BOX_PRICES.large : BOX_PRICES[size]"],
      hint: 'That is the mistake from last week. Test the price of a small box itself.'
    },
    {
      label: 'has the wrong price for a small box',
      change: ['small: 14', 'small: 15'],
      hint: "Call boxPrice('small') in your test and compare it with the exact number on the price list in prices.js."
    }
  ]),

  eggs: block('withEggs', [
    {
      label: 'adds one dozen eggs whatever the number',
      change: ['dozens * EGG_PRICE_PER_DOZEN', 'EGG_PRICE_PER_DOZEN'],
      hint: 'Use two dozen, as the task says, so the number of dozens makes a difference.'
    },
    {
      label: 'always starts from the small box price',
      change: ['return boxPrice(size) + dozens', "return boxPrice('small') + dozens"],
      hint: 'Use a medium box, as the task says, so the size makes a difference.'
    },
    {
      label: 'has the wrong price for a medium box',
      change: ['medium: 19', 'medium: 20'],
      hint: 'Work the expected price out by hand from the price list, and write that number in your test instead of getting it from the code.'
    }
  ]),

  delivery: block('deliveryCharge', [
    {
      label: 'still charges the old town price',
      change: ['town: 4', 'town: 3'],
      hint: 'Read the delivery prices in prices.js: town delivery went up in March, and the test should say so.'
    },
    {
      label: 'charges town delivery at the village price',
      change: ['return DELIVERY[zone]', 'return DELIVERY.village'],
      hint: 'Keep a test of town delivery in this block.'
    }
  ]),

  async member(t) {
    const dir = await t.sandbox()
    const [member, others] = await Promise.all([
      compare(t, dir, ['small', 'medium', 'large'].map((size) => ['memberPrice', [size]])),
      compare(t, dir, [
        ['boxPrice', ['small']],
        ['boxPrice', ['medium']],
        ['boxPrice', ['large']],
        ['withEggs', ['large', 3]],
        ['deliveryCharge', ['gate']],
        ['deliveryCharge', ['village']],
        ['deliveryCharge', ['town']]
      ])
    ])
    const crashed = [...member, ...others].find((r) => !r.ok)
    if (crashed) {
      return [
        {
          name: `${target} runs`,
          passed: false,
          message: `${crashed.shown} did not run, so Check cannot read the prices. Read the error in the output, then look at that part of ${target}.`,
          output: crashed.error
        }
      ]
    }
    // Judged against the learner's own box prices, so a changed box price is reported once, below.
    const memberRight = member.every((r, i) => r.value === others[i].value - right.MEMBER_DISCOUNT)
    const othersRight = others.every((r) => r.same)
    return [
      {
        name: 'Members pay less for every box size',
        passed: memberRight,
        message: memberRight
          ? undefined
          : `memberPrice still gives members a price that is not on the club's terms in ${target}. The test from Lorcan is right here: read what it says it received, then look at the line in memberPrice that uses MEMBER_DISCOUNT.`,
        output: member.map((r) => r.line).join('\n')
      },
      {
        name: 'The other prices stay as they were',
        passed: othersRight,
        message: othersRight
          ? undefined
          : `Only memberPrice needed a change, but another price in ${target} is different now. Put it back the way it came.`,
        output: others.filter((r) => !r.same).map((r) => r.line).join('\n') || undefined
      }
    ]
  }
}

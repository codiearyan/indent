import { readFile } from 'node:fs/promises'
import { block, judge } from '../../grading.mjs'

const test = 'src/packing.test.js'
const target = 'src/packing.js'

function explain(test) {
  if (/is not a spy or a call to a spy/.test(test.failure ?? '')) {
    return `"${test.name}" asks about the calls of a helper that is not being watched. Leave the helpers alone: call packingList and check the list it gives back.`
  }
  return undefined
}

const task = (title, wrong) => async (t) =>
  judge(t, {
    test,
    target,
    ...block(title),
    wrong,
    limit: 2000,
    explain,
    same: [
      {
        label: 'is written another way but packs every box the same',
        code: await readFile(t.chapterPath('grader/rewrite.js'), 'utf8'),
        message: (name) =>
          `"${name}" fails on a rewrite of packing.js that packs every order exactly the same: the same items in the same order, the same weight, the same crate. So it checks how the code is written, like which helper it calls, not what comes out. Test the list packingList gives back instead.`
      }
    ]
  })

const SORT = 'b.kg - a.kg'
const NAMES = 'items: items.map((item) => item.name)'
const SUM = 'items.reduce((total, item) => total + item.kg, 0)'
const CRATE = 'kg <= SMALL_CRATE_KG ?'

export const checks = {
  order: task('packing order', [
    {
      label: 'packs the lightest item first',
      change: [SORT, 'a.kg - b.kg'],
      hint: 'Compare the whole list of items with the order you worked out by hand, heaviest first.'
    },
    {
      label: 'keeps the items in the order the customer wrote them',
      change: ['const items = helpers.heaviestFirst(order.items)', 'const items = order.items'],
      hint: 'Use an order whose items are not already heaviest first, so packing has to move them.'
    },
    {
      label: 'leaves the last item off the list',
      change: [NAMES, 'items: items.slice(0, -1).map((item) => item.name)'],
      hint: 'Compare the whole list of items, every one of them, not only the first.'
    }
  ]),

  crate: task('crate', [
    {
      label: 'puts a box of exactly 5 kg in a large crate',
      change: [CRATE, 'kg < SMALL_CRATE_KG ?'],
      hint: 'Test a box that weighs exactly SMALL_CRATE_KG, and check the crate on its list.'
    },
    {
      label: 'asks crateFor but writes large crate on every list',
      change: ['crate: helpers.crateFor(kg)', "crate: helpers.crateFor(kg) && 'large crate'"],
      hint: 'Check the crate on the list for a box that should go in a small one.'
    },
    {
      label: 'lets a box of up to 6 kg into a small crate',
      change: [CRATE, 'kg <= SMALL_CRATE_KG + 1 ?'],
      hint: 'Test a box just over SMALL_CRATE_KG too, as close to it as the weights allow, and check the crate on its list.'
    }
  ]),

  total: task('total weight', [
    {
      label: 'leaves the lightest item out of the total',
      change: [SUM, `items.slice(0, -1).reduce((total, item) => total + item.kg, 0)`],
      hint: 'Add up the weights yourself and write that number in the test, rather than asking the code how to add them.'
    },
    {
      label: 'drops the half kilos when it adds up',
      change: [SUM, 'items.reduce((total, item) => total + Math.floor(item.kg), 0)'],
      hint: 'Use an order with half kilos in it, and write the total you worked out by hand.'
    },
    {
      label: 'counts the heaviest item twice',
      change: ['const kg = helpers.totalKg(items)', 'const kg = helpers.totalKg(items) + items[0].kg'],
      hint: 'Compare the weight on the list with the total you worked out by hand.'
    }
  ])
}

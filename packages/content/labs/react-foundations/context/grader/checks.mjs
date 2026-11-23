import {
  WARNING,
  clean,
  detail,
  drawCountedWith,
  explain,
  exportType,
  isDrawnBy,
  openComponent,
  warningsOf
} from '../../grading.mjs'

// The check's own shelves, discounts and prices, so the shop's own cannot be typed in as the answer.
const pence = (n) => `£${(n / 100).toFixed(2)}`
const off = (price, percent) => Math.round((price * (100 - percent)) / 100)
const item = (id, name, pricePence) => ({ id, name, pricePence })
const LAMPS = { id: 'lamps', name: 'Lamps and lanterns', items: [item('l-1', 'Signal lamp', 2450), item('l-2', 'Tin lantern', 1180)] }
const MAPS = { id: 'maps', name: 'Old maps', items: [item('m-1', 'Map of the line, 1931', 760), item('m-2', 'Depot plan', 395)] }
const TOKENS = { id: 'tokens', name: 'Gift tokens', fullPrice: true, items: [item('t-1', 'Gift token, £20', 2000), item('t-2', 'Gift token, £15', 1500)] }

/**
 * The props the component `name` was drawn with, read from React's record on the element it drew.
 * Undefined when that record cannot be read or another component drew it, so nothing is judged.
 */
function componentProps(element, name) {
  try {
    const key = element && Object.keys(element).find((k) => k.startsWith('__reactFiber$'))
    if (!key || !isDrawnBy(element, name)) return undefined
    for (let fiber = element[key].return; fiber; fiber = fiber.return) {
      if (typeof fiber.type === 'function') return fiber.memoizedProps ?? undefined
    }
  } catch {
    // React's own detail changed: judge nothing.
  }
  return undefined
}

const stopped = (error) => detail('The shop runs without errors', false, explain(error), error)
const isContext = (page, value) =>
  Boolean(value) && typeof value === 'object' && value.$$typeof === page.window.React.createContext(0).$$typeof

/** The discount file alone. */
async function discountPage(t) {
  const { page, problem } = await openComponent(t, 'src/discount.js')
  if (problem) return { problem }
  return { page, context: page.window.mod?.DiscountContext }
}

/** One detail when the discount file has no context to use, or null. */
function contextProblem(page, exports, context, firstTask) {
  if (context === undefined) {
    const others = Object.keys(exports ?? {})
    const near = others.find((name) => name.toLowerCase() === 'discountcontext')
    return detail(
      'discount.js exports DiscountContext',
      false,
      firstTask && near
        ? `discount.js exports ${near}, not DiscountContext. The screens and the check import it as DiscountContext, with the capitals as written.`
        : firstTask
        ? 'discount.js has no export called DiscountContext yet. Make it with createContext and export it by name.'
        : 'discount.js has no DiscountContext yet. That is the first task of this issue: do it first.',
      `exports found: ${others.join(', ') || '(none)'}`
    )
  }
  if (!isContext(page, context)) {
    return detail(
      'DiscountContext is a context',
      false,
      firstTask
        ? `DiscountContext is ${Array.isArray(context) ? 'an array' : typeof context === 'object' ? 'a plain object' : `a ${typeof context}`}, not a context. A context is what createContext from react returns.`
        : 'DiscountContext is not a context yet. That is the first task of this issue: do it first.'
    )
  }
  return null
}

/** What the context gives a component of the check's own, under the providers listed from the outside in. */
async function readUnder(page, context, values) {
  const { h, React } = page.window
  page.checkReader ??= function CheckReader() {
    const value = React.useContext(context)
    return h('p', { className: 'reader' }, value === undefined ? '(undefined)' : JSON.stringify(value))
  }
  let tree = h(page.checkReader)
  for (const value of [...values].reverse()) tree = h(context, { value }, tree)
  page.window.clear()
  const { errors } = await drawCountedWith(page, tree)
  return { errors, shown: clean(page.$('#root .reader')?.textContent) }
}

/** The shop's components with the discount file beside them. */
async function shopPage(t, names) {
  const { page, problem } = await openComponent(t, '.grader/both.js', { '.grader/both.js': 'grader/both.js' })
  if (problem) return { problem }
  for (const name of names) {
    if (exportType(page, name) !== 'function') {
      return { problem: detail(`Shop.jsx exports ${name}`, false, `Shop.jsx has no export called ${name} any more. Keep the name and the export.`) }
    }
  }
  const context = page.window.mod.discount?.DiscountContext
  const wrong = contextProblem(page, page.window.mod.discount, context, false)
  if (wrong) return { problem: wrong }
  return { page, context }
}

/** Draws `element` inside the providers listed from the outside in, and returns any error. */
async function drawUnder(page, context, values, element) {
  const { h } = page.window
  let tree = element
  for (const value of [...values].reverse()) tree = h(context, { value }, tree)
  page.window.clear()
  const { errors } = await drawCountedWith(page, tree)
  return errors[0] ?? null
}

const prices = (page) => page.$$('#root .price').map((el) => clean(el.textContent))
const rows = (page) =>
  page.$$('#root li').map((li) => `${clean(li.querySelector('.name')?.textContent) || '(no name)'} ${clean(li.querySelector('.price')?.textContent) || '(no price)'}`)

const PRICE_CASES = [
  { what: 'under a provider of 25 percent', values: [25], pence: 840, percent: 25 },
  { what: 'under no provider', values: [], pence: 1250, percent: 0 },
  { what: 'under 25 percent, inside it 50 percent', values: [25, 50], pence: 998, percent: 50 },
  { what: 'under 40 percent, inside it 0 percent', values: [40, 0], pence: 720, percent: 0 }
]

/** Task 2: the details, or the first thing that went wrong. */
async function priceReads(page, context) {
  const { h, mod } = page.window
  const log = []
  for (const c of PRICE_CASES) {
    const error = await drawUnder(page, context, c.values, h(mod.Price, { pence: c.pence }))
    if (error) return [stopped(error)]
    const shown = clean(page.$('#root .price')?.textContent) || '(no price)'
    log.push(`Price for ${c.pence} pence, ${c.what}: ${shown}`)
    c.shown = shown
  }
  const output = log.join('\n')
  const wrong = PRICE_CASES.find((c) => c.shown !== pence(off(c.pence, c.percent)))
  if (!wrong) return [detail('Price takes the discount from the nearest provider', true, '', output)]
  let message = 'Price shows its price with the discount of the nearest provider above it taken off, and the full price when there is none.'
  if (PRICE_CASES.some((c) => /nan|undefined/i.test(c.shown))) {
    const error = await drawUnder(page, context, [], h(mod.Price, { pence: 1000, discount: 50 }))
    const fromProp = !error && clean(page.$('#root .price')?.textContent) === pence(500)
    message = fromProp
      ? 'Price showed no proper price. It still takes the discount from a prop, and the check gave it none: only a provider above it. Read the discount from DiscountContext with useContext.'
      : 'Price showed no proper price: the discount it worked with is not a number. useContext(DiscountContext) gives the value of the nearest provider itself, here a number of percent, to hand to discounted as it is.'
  }
  else if (PRICE_CASES.every((c) => c.shown === pence(c.pence)))
    message = 'Price showed the full price under every provider. It does not read DiscountContext yet: useContext gives a component the value of the nearest provider above it.'
  else if (wrong.values.length > 1) message = 'Under two providers, one inside the other, Price did not use the inner one. The nearest provider above a component is the one that counts.'
  else if (!wrong.values.length) message = 'With no provider above it, Price should show the full price: the context gives its default, no discount.'
  return [detail('Price takes the discount from the nearest provider', false, message, output)]
}

async function priceProblem(page, context) {
  const failed = (await priceReads(page, context)).find((r) => !r.passed)
  if (!failed) return null
  if (failed.name.includes('without errors')) return failed
  return detail('Price reads the discount', false, 'Price does not read the discount from DiscountContext yet. That is the second task of this issue: do it first.')
}

/** Draws ShopPage with the check's shelves, presses Member twice, and returns what each price showed. */
async function memberRound(page, shelves, memberDiscount) {
  const { h, mod } = page.window
  const logsBefore = page.logs.length
  page.window.clear()
  const { errors } = await drawCountedWith(page, h(mod.ShopPage, { shelves, memberDiscount }))
  if (errors.length) return { problem: stopped(errors[0]) }
  const box = page.$('#root input[type="checkbox"]')
  if (!box) return { problem: detail('The shop has its Member box', false, 'The check could not find the Member box. Keep the checkbox as it was.') }
  const states = []
  const errorsBefore = page.errors.length
  const read = (what) => states.push({ what, prices: prices(page), rows: rows(page) })
  read('not a member')
  await page.click(box)
  read('Member ticked')
  await page.click(box)
  read('Member unticked again')
  if (page.errors.length > errorsBefore) return { problem: stopped(page.errors[errorsBefore]) }
  const warning = warningsOf(page.logs.slice(logsBefore), WARNING.contextValue)[0]
  const output = states.map((s) => `${s.what}:\n${s.rows.map((r) => `  ${r}`).join('\n') || '  (no items)'}`).join('\n')
  return { states, warning, output, intro: `ShopPage drawn with shelves of the check's own and a member discount of ${memberDiscount} percent` }
}

const wantPrices = (shelves, percent) => shelves.flatMap((s) => s.items.map((i) => pence(off(i.pricePence, s.fullPrice ? 0 : percent))))
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])

export const checks = {
  async make(t) {
    const { page, context, problem } = await discountPage(t)
    if (problem) return [problem]
    const wrong = contextProblem(page, page.window.mod, context, true)
    if (wrong) return [wrong]
    const results = []
    const none = await readUnder(page, context, [])
    if (none.errors.length) return [stopped(none.errors[0])]
    results.push(
      detail(
        'With no provider, the context gives no discount',
        none.shown === '0',
        none.shown === '(undefined)'
          ? 'Read with no provider above it, the context gave undefined. That is its default, and a context made with nothing in the brackets has none. Give createContext the value to use when there is no provider: no discount.'
          : 'Read with no provider above it, the context should give its default: no discount, a discount of 0 percent.',
        `a component of the check's own read DiscountContext with no provider above it: ${none.shown}`
      )
    )
    const under = await readUnder(page, context, [35])
    if (under.errors.length) return [stopped(under.errors[0])]
    results.push(
      detail(
        'Under a provider, the context gives its value',
        under.shown === '35',
        'Read under a provider of the check\'s own, the context did not give the provider\'s value.',
        `a component of the check's own read DiscountContext under a provider with the value 35: ${under.shown}`
      )
    )
    return results
  },

  async price(t) {
    const { page, context, problem } = await shopPage(t, ['Price'])
    if (problem) return [problem]
    return priceReads(page, context)
  },

  async provide(t) {
    const { page, context, problem } = await shopPage(t, ['ShopPage', 'Shelf', 'Price'])
    if (problem) return [problem]
    const first = await priceProblem(page, context)
    if (first) return [first]

    const round = await memberRound(page, [LAMPS, MAPS], 20)
    if (round.problem) return [round.problem]
    const [before, ticked, after] = round.states
    const full = wantPrices([LAMPS, MAPS], 0)
    const member = wantPrices([LAMPS, MAPS], 20)
    const output = `${round.intro}\n${round.output}`
    let message = ''
    if (round.warning)
      message = 'React says in the console that the provider needs a value prop. A provider with no value gives every price below it undefined: hand it the discount as value.'
    else if (!same(before.prices, full)) message = 'Before Member is ticked, every price should be the full price.'
    else if (same(ticked.prices, full))
      message = 'Ticking Member changed no price. Price reads the nearest provider of DiscountContext above it, and with none it gets the default, no discount. Put the shelves inside a provider of DiscountContext in ShopPage, with the discount as its value.'
    else if (!same(ticked.prices, member)) message = 'With Member ticked, the prices did not have the member discount taken off. ShopPage gets that discount in its memberDiscount prop, and the check hands it one of its own.'
    else if (!same(after.prices, full)) message = 'With Member unticked again, every price should go back to the full price.'
    const results = [detail('Member changes every price on the page', !message, message, output)]
    if (message) return results

    const handedOn = [
      ['section.shelf', 'Shelf', 'ShopPage still hands each Shelf a discount prop, which nothing reads now. Take it out where ShopPage draws Shelf and where Shelf takes it, so a new shelf has nothing to forget.'],
      ['section.shelf li', 'ShopItem', 'Shelf still hands each ShopItem a discount prop, which nothing reads now. Take it out where Shelf draws ShopItem and where ShopItem takes it.'],
      ['section.shelf .price', 'Price', 'ShopItem still hands Price a discount prop, which Price no longer reads. Take it out where ShopItem draws Price.']
    ].find(([selector, name]) => 'discount' in (componentProps(page.$(`#root ${selector}`), name) ?? {}))
    results.push(
      detail(
        'No part hands the discount down any more',
        !handedOn,
        handedOn?.[2],
        handedOn ? `${handedOn[1]} was drawn with the props: ${Object.keys(componentProps(page.$(`#root ${handedOn[0]}`), handedOn[1])).join(', ')}` : undefined
      )
    )
    if (handedOn) return results

    const { h, mod } = page.window
    const error = await drawUnder(page, context, [25], h(mod.Shelf, { shelf: MAPS }))
    const shelfRows = rows(page)
    const shelfOutput = `Shelf drawn on its own with the check's shelf ${MAPS.name}, under a provider of 25 percent and with no discount prop:\n${error ?? (shelfRows.map((r) => `  ${r}`).join('\n') || '  (no items)')}`
    let shelfMessage = ''
    if (error || shelfRows.length !== MAPS.items.length || MAPS.items.some((i) => !shelfRows.some((r) => r.includes(i.name))))
      shelfMessage = 'Shelf drawn on its own with a shelf did not show that shelf\'s items. Only the discount comes through the context: the shelf and its items still come as props, which say plainly what each part needs.'
    else if (!same(prices(page), wantPrices([MAPS], 25)))
      shelfMessage = 'Shelf drawn on its own under a provider, with no discount prop, did not show the provider\'s discount. Shelf and ShopItem no longer need to hand a discount down: Price reads it.'
    results.push(detail('Shelf works from its props and the context', !shelfMessage, shelfMessage, shelfOutput))
    return results
  },

  async vouchers(t) {
    const { page, context, problem } = await shopPage(t, ['ShopPage', 'Price'])
    if (problem) return [problem]
    const first = await priceProblem(page, context)
    if (first) return [first]
    const plain = await memberRound(page, [LAMPS, MAPS], 20)
    if (plain.problem) return [plain.problem]
    if (!same(plain.states[1].prices, wantPrices([LAMPS, MAPS], 20))) {
      return [detail('ShopPage provides the discount', false, 'Ticking Member does not change the prices through the context yet. That is the third task of this issue: do it first.')]
    }

    const shelves = [LAMPS, TOKENS, MAPS]
    const round = await memberRound(page, shelves, 30)
    if (round.problem) return [round.problem]
    const [before, ticked, after] = round.states
    const tokens = TOKENS.items.map((i) => pence(i.pricePence))
    const tokenPrices = (s) => s.prices.slice(LAMPS.items.length, LAMPS.items.length + TOKENS.items.length)
    const others = (s) => [...s.prices.slice(0, LAMPS.items.length), ...s.prices.slice(LAMPS.items.length + TOKENS.items.length)]
    const output = `${round.intro}; the shelf ${TOKENS.name} is marked fullPrice\n${round.output}`
    let message = ''
    if (round.warning)
      message = 'React says in the console that a provider needs a value prop. A provider with no value gives every price below it undefined: give the inner provider the value of no discount.'
    else if (!same(before.prices, wantPrices(shelves, 0)) || !same(after.prices, wantPrices(shelves, 0))) message = 'When Member is not ticked, every price should be the full price.'
    else if (!same(tokenPrices(ticked), tokens))
      message = 'With Member ticked, the shelf marked fullPrice still took the member discount. Price reads the nearest provider above it, so a provider inside the outer one, around that shelf, can say there is no discount there.'
    else if (!same(others(ticked), others({ prices: wantPrices(shelves, 30) })))
      message = 'The shelf marked fullPrice kept its full price, and the shelves around it lost their member discount too. Only the shelves marked fullPrice go inside the provider of no discount.'
    return [detail('Shelves marked fullPrice keep their full price', !message, message, output)]
  }
}


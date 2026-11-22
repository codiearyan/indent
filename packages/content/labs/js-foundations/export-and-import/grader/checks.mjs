import {
  callAll,
  cases,
  declares,
  exportsOf,
  missing,
  pathCase,
  prepare,
  shape,
  sourceOf,
  stopped
} from '../../codebase-grading.mjs'

const MONEY = 'src/money.js'
const LABELS = 'src/labels.js'
const EMAILS = 'src/emails.js'

const price = (cents) => {
  const euros = Math.floor(cents / 100)
  const rest = cents - euros * 100
  return `${euros}.${rest < 10 ? '0' : ''}${rest} EUR`
}
const sale = (cents, percent) => Math.round((cents * (100 - percent)) / 100)
const oldPrice = (cents) => `${cents / 100} EUR`

const pine = { name: 'Pine', grams: 120, priceCents: 990 }
const amber = { name: 'Amber', grams: 200, priceCents: 1850 }
const birch = { name: 'Birch', grams: 500, priceCents: 3205 }
const fig = { name: 'Fig', grams: 350, priceCents: 2400 }

const loose = (text) => String(text).toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * Details for the run with the grader's own money.js, then what the function gave with the marked
 * money.js, which writes every price as price(cents): null when it did not give text.
 */
async function withShared(t, { file, fn, list, absent, probe }) {
  const right = await cases(t, await prepare(t, { swaps: { [MONEY]: t.chapterPath('solution/src/money.js') } }), {
    file,
    fn,
    list,
    absent
  })
  if (stopped(right)) return { details: right }
  const dir = await prepare(t, { swaps: { [MONEY]: t.chapterPath('grader/marked-money.js') } })
  const marked = await callAll(t, dir, file, fn, [probe])
  const value = marked.results?.[0]?.value
  return { details: right, got: typeof value === 'string' ? value : null }
}

export const checks = {
  async share(t) {
    const gone = await missing(t, MONEY)
    if (gone) return [gone]
    const dir = await prepare(t)
    const { names, problem } = await exportsOf(t, dir, MONEY)
    if (problem) return [problem]
    const list = Object.keys(names)
    const want = ['formatPrice', 'salePrice']
    const shown = `money.js exports: ${list.join(', ') || 'nothing'}`
    const details = want.map((name) => {
      const passed = names[name] === 'function'
      if (passed) return { name: `Exports ${name}`, passed, output: shown }
      const near = list.find((n) => n.toLowerCase() === name.toLowerCase())
      const others = list.filter((n) => !want.includes(n) && n !== 'twoDigits')
      const message = !list.length
        ? 'money.js shares nothing yet. Other files can only import what a file exports: write an export line under the Task 1 comment that names formatPrice and salePrice.'
        : near
          ? `money.js exports ${near}, but the function is called ${name}. Other files import a name exactly as it is exported, capital letters included.`
          : others.length
            ? `money.js does not export ${name}, though it exports ${others.join(' and ')}. Export each function under the name it was made with, so other files import it by that name.`
            : `money.js does not export ${name} yet. Name it on the export line too.`
      return { name: `Exports ${name}`, passed, message, output: shown }
    })
    details.push(
      shape(
        'twoDigits stays in money.js',
        !('twoDigits' in names),
        'twoDigits only helps formatPrice inside money.js, and no other file needs it, so it is not exported: keep it off the export line, with no export in front of its own line.'
      )
    )
    if (!details[0].passed || !details[1].passed) return details
    const kept = 'formatPrice and salePrice should work as they did before. This task only adds an export line: put the functions back as they were.'
    const formats = await cases(t, dir, {
      file: MONEY,
      fn: 'formatPrice',
      list: [1805, 990, 4000].map((cents) => ({
        name: `formatPrice still writes ${cents}`,
        args: [cents],
        expected: price(cents),
        hint: kept
      }))
    })
    const sales = await cases(t, dir, {
      file: MONEY,
      fn: 'salePrice',
      list: [[2400, 20], [1850, 10]].map(([cents, percent]) => ({
        name: `salePrice still takes ${percent}% off`,
        args: [cents, percent],
        expected: sale(cents, percent),
        hint: kept
      }))
    })
    return [...details, ...formats, ...sales]
  },

  async import(t) {
    const gone = await missing(t, LABELS)
    if (gone) return [gone]
    const casing = await pathCase(t, LABELS)
    if (casing) return [casing]
    const { details, got } = await withShared(t, {
      file: LABELS,
      fn: 'shelfLabel',
      absent: 'labels.js does not export shelfLabel any more. Keep the export line at the bottom as it was.',
      list: [amber, pine, birch].map((candle) => ({
        name: `Label for ${candle.name}`,
        args: [candle],
        expected: `${candle.name}, ${candle.grams} g, ${price(candle.priceCents)}`,
        hint: 'The label is the name, the grams with a g, and the price as formatPrice from money.js writes it, with commas between them.',
        explain: (r) =>
          r.value === `${candle.name}, ${candle.grams} g, ${oldPrice(candle.priceCents)}`
            ? 'The price still comes out without its zeros, the way the old labelPrice writes it. Make shelfLabel use formatPrice from money.js.'
            : undefined
      })),
      probe: [fig]
    })
    if (stopped(details)) return details
    const text = await sourceOf(t, LABELS)
    return [
      ...details,
      shape(
        'shelfLabel uses formatPrice from money.js',
        got === null || got.includes('price('),
        declares(text, 'formatPrice')
          ? 'labels.js has a formatPrice of its own, a copy of the one in money.js. Copies drift apart, which is how the labels went wrong: remove it and import formatPrice from money.js instead.'
          : 'shelfLabel does not use the formatPrice of money.js: labels.js still writes the price some other way. Import formatPrice from money.js and use it in shelfLabel.'
      ),
      shape(
        'labelPrice is gone',
        !declares(text, 'labelPrice'),
        'labels.js still has labelPrice, the old copy. Remove it, so nobody uses it by mistake.'
      )
    ]
  },

  async sale(t) {
    const gone = await missing(t, LABELS)
    if (gone) return [gone]
    const casing = await pathCase(t, LABELS)
    if (casing) return [casing]
    const text = await sourceOf(t, LABELS)
    const { details, got } = await withShared(t, {
      file: LABELS,
      fn: 'saleLabel',
      absent: declares(text, 'saleLabel')
        ? 'labels.js has saleLabel, but does not export it, so no other file can use it. Put export in front of the word function on its first line.'
        : 'Check cannot find saleLabel in labels.js. Keep it with that name, capital L included.',
      list: [
        [fig, 20],
        [amber, 10],
        [pine, 50]
      ].map(([candle, percent]) => {
        const expected = `${candle.name}, ${candle.grams} g, ${price(sale(candle.priceCents, percent))}, ${percent}% off`
        return {
          name: `${candle.name} at ${percent}% off`,
          args: [candle, percent],
          expected,
          hint: 'The sale label is the name and the grams as on the shelf label, then the sale price written by formatPrice, then the percent with % off, with commas between them.',
          explain: (r) =>
            typeof r.value !== 'string'
              ? undefined
              : r.value.includes(price(candle.priceCents)) && !expected.includes(price(candle.priceCents))
                ? 'The label shows the full price. Work out the sale price with salePrice from money.js first, then write that with formatPrice.'
                : loose(r.value) === loose(expected)
                  ? 'Close. Compare the label letter by letter with the example in the task: spaces, commas and the % count.'
                  : undefined
        }
      }),
      probe: [fig, 20]
    })
    if (stopped(details)) return details
    return [
      ...details,
      shape(
        'saleLabel uses salePrice and formatPrice from money.js',
        got === null || (got.includes('price(') && !got.includes('price(1920)')),
        declares(text, 'formatPrice') || declares(text, 'salePrice')
          ? 'labels.js has a copy of a function from money.js. Remove the copy and import the function from money.js instead.'
          : got?.includes('price(1920)')
            ? 'saleLabel works the sale price out itself. Use salePrice from money.js, so the rule for a sale lives in one place.'
            : 'saleLabel writes the price itself. Use formatPrice from money.js, so every price is written the same way.'
      ),
      shape(
        'export in front of saleLabel',
        /^export\s+function\s+saleLabel\b/m.test(text),
        'saleLabel is exported on the line at the bottom. This task asks for the other way: export in front of the word function on its first line, so you have written both.'
      )
    ]
  },

  async email(t) {
    const gone = await missing(t, EMAILS, 'Keep emails.js in the src folder, with that name.')
    if (gone) return [gone]
    const casing = await pathCase(t, EMAILS)
    if (casing) return [casing]
    const text = await sourceOf(t, EMAILS)
    const { details, got } = await withShared(t, {
      file: EMAILS,
      fn: 'orderLine',
      absent: /^export\s+default\b/m.test(text)
        ? 'emails.js shares orderLine as its default export, which has no name of its own. Other files import orderLine by its name, in curly braces: write export in front of function, without default.'
        : declares(text, 'orderLine')
          ? 'emails.js has orderLine, but does not export it, so no other file can use it. Export it, on an export line or with export in front.'
          : 'emails.js does not have a function called orderLine yet. Write it under the comment, spelt exactly so, capital L included, and export it.',
      list: [
        [{ name: 'Cedar', priceCents: 1800 }, 2],
        [{ name: 'Fig', priceCents: 2400 }, 1],
        [{ name: 'Pine', priceCents: 990 }, 3]
      ].map(([candle, qty]) => {
        const expected = `${qty} x ${candle.name}, ${price(candle.priceCents * qty)}`
        return {
          name: `${qty} x ${candle.name}`,
          args: [candle, qty],
          expected,
          hint: 'The line is how many, a space, x, a space, the name, a comma and a space, then what they cost together, written by formatPrice.',
          explain: (r) =>
            typeof r.value !== 'string'
              ? undefined
              : qty > 1 && r.value.endsWith(price(candle.priceCents))
                ? 'The line shows the price of one candle. It shows what all of them cost together.'
                : loose(r.value) === loose(expected)
                  ? 'Close. Compare the line letter by letter with the example in the task: spaces, the x and the comma count.'
                  : undefined
        }
      }),
      probe: [{ name: 'Cedar', priceCents: 1800 }, 2]
    })
    if (stopped(details)) return details
    return [
      ...details,
      shape(
        'orderLine uses formatPrice from money.js',
        got === null || got.includes('price('),
        declares(text, 'formatPrice')
          ? 'emails.js has a formatPrice of its own, a copy of the one in money.js. Remove it and import formatPrice from money.js instead.'
          : 'orderLine does not use the formatPrice of money.js: it writes the price some other way. Import formatPrice from money.js and use it.'
      )
    ]
  }
}

import { readFile } from 'node:fs/promises'
import {
  cases,
  declares,
  exportedValue,
  exportsOf,
  missing,
  pathCase,
  prepare,
  runFile,
  same,
  shape,
  show,
  sourceOf,
  stopped
} from '../../codebase-grading.mjs'

const SHOP = 'src/shop.js'
const CATALOGUE = 'src/catalogue.js'
const STOCK = 'src/stock.js'
const SETTINGS = 'src/settings.js'
const PAGE = 'src/page.js'

const original = [
  { sku: 'CED-200', name: 'Cedar', priceCents: 1800, stock: 4 },
  { sku: 'FIG-350', name: 'Fig', priceCents: 2400, stock: 0 },
  { sku: 'AMB-200', name: 'Amber', priceCents: 1900, stock: 12 },
  { sku: 'SAG-200', name: 'Sage', priceCents: 1700, stock: 2 }
]

const shelf = [0, 1, 2, 3, 4, 5, 6].map((stock, i) => ({
  name: ['Pine', 'Moss', 'Plum', 'Rose', 'Oak', 'Mint', 'Yuzu'][i],
  stock
}))

const low = (candles, lowAt) => candles.filter((c) => c.stock > 0 && c.stock <= lowAt).map((c) => c.name)
const line = (c, inStock = c.stock > 0) => (inStock ? `${c.name}: ${c.stock} left` : `${c.name}: sold out`)

/** The given files, with the grader's copy in place of the learner's, except for `own`. */
function others(t, own, extra = {}) {
  const given = {
    [CATALOGUE]: t.chapterPath('solution/src/catalogue.js'),
    [STOCK]: t.chapterPath('solution/src/stock.js'),
    [SETTINGS]: t.chapterPath('solution/src/settings.js'),
    [PAGE]: t.chapterPath('solution/src/page.js')
  }
  for (const file of own) delete given[file]
  return { ...given, ...extra }
}

/**
 * Runs shop.js with the given swaps and says whether what it printed has `mark` in it. When shop.js
 * stops for a reason that has nothing to do with `file`, as it can halfway through a later move,
 * its import of `name` from `file` is judged on the source instead.
 */
async function shopPrints(t, swaps, mark, { file, name }) {
  const { stdout, problem } = await runFile(t, await prepare(t, { swaps, quiet: false }), SHOP)
  if (!problem) return { printed: stdout, has: stdout.includes(mark) }
  const base = file.split('/').pop()
  const imports = new RegExp(
    `\\bimport\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['"]\\./${base.replace('.', '\\.')}['"]`
  ).test(await sourceOf(t, SHOP))
  const elsewhere = !problem.message.includes(base)
  return imports && elsewhere ? { printed: '', has: true } : { problem }
}

async function needs(t, files) {
  for (const [file, what] of files) {
    const gone = await missing(t, file, what)
    if (gone) return gone
    const casing = await pathCase(t, file)
    if (casing) return casing
  }
  return null
}

export const checks = {
  async catalogue(t) {
    const problem = await needs(t, [
      [CATALOGUE, 'Task 1 puts the candles in a file with exactly that name, beside shop.js.'],
      [SHOP, 'Keep shop.js in the src folder, with that name.']
    ])
    if (problem) return [problem]
    const dir = await prepare(t, { swaps: others(t, [CATALOGUE]) })
    const { names, problem: broken } = await exportsOf(t, dir, CATALOGUE)
    if (broken) return [broken]
    const listed = Object.keys(names)
    if (names.catalogue !== 'object') {
      return [
        {
          name: 'catalogue.js exports catalogue',
          passed: false,
          message: !listed.length
            ? 'catalogue.js shares nothing yet. Move the list here from shop.js and export it with the name catalogue.'
            : `catalogue.js exports ${listed.join(' and ')}, not a list called catalogue. Export the list under the name catalogue, so shop.js can import it by that name.`,
          output: `catalogue.js exports: ${listed.join(', ') || 'nothing'}`
        }
      ]
    }
    const value = await exportedValue(t, dir, CATALOGUE, 'catalogue')
    const text = await sourceOf(t, SHOP)
    const run = await shopPrints(t, others(t, [], { [CATALOGUE]: t.chapterPath('grader/catalogue.js') }), 'Juniper', {
      file: CATALOGUE,
      name: 'catalogue'
    })
    return [
      {
        name: 'catalogue.js holds the same four candles',
        passed: same(value, original),
        message: same(value, original)
          ? undefined
          : 'The list in catalogue.js is not the one shop.js had. Move it as it is, every candle and every property, without changing it.',
        output: `catalogue is ${show(value)}`
      },
      shape(
        'shop.js keeps no list of its own',
        !/\bsku\s*:/.test(text),
        'shop.js still has a list of candles in it. Move the list to catalogue.js, so there is one list, and import it in shop.js.'
      ),
      run.problem ?? {
        name: 'shop.js uses the list from catalogue.js',
        passed: run.has && !run.printed.includes('Cedar'),
        message:
          run.has && !run.printed.includes('Cedar')
            ? undefined
            : 'Check put other candles in catalogue.js, and shop.js still printed the old ones. Import catalogue from catalogue.js at the top of shop.js and remove the list from shop.js.',
        output: run.printed
      }
    ]
  },

  async stock(t) {
    const problem = await needs(t, [
      [STOCK, 'Task 2 puts the stock rules in a file with exactly that name, beside shop.js.'],
      [SHOP, 'Keep shop.js in the src folder, with that name.']
    ])
    if (problem) return [problem]
    const stockText = await sourceOf(t, STOCK)
    const dir = await prepare(t, { swaps: others(t, [STOCK]) })
    const absent = (fn) =>
      declares(stockText, fn)
        ? `stock.js has ${fn}, but does not export it, and shop.js needs it. Export it.`
        : `Check cannot find ${fn} in stock.js. Move it here from shop.js with the same name.`
    const has = await cases(t, dir, {
      file: STOCK,
      fn: 'inStock',
      absent: absent('inStock'),
      list: [0, 1, 7].map((stock) => ({
        name: `inStock with ${stock} on the shelf`,
        args: [{ name: 'Pine', stock }],
        expected: stock > 0,
        hint: 'inStock should work as it did in shop.js. Move it as it was.'
      }))
    })
    if (stopped(has)) return has
    const lows = await cases(t, dir, {
      file: STOCK,
      fn: 'lowStock',
      absent: absent('lowStock'),
      list: [
        { name: 'lowStock on a shelf of its own', args: [shelf], expected: low(shelf, 3) },
        { name: 'lowStock on an empty shelf', args: [[]], expected: [] }
      ].map((c) => ({
        ...c,
        hint: 'lowStock should work as it did in shop.js, with isLow beside it in stock.js. Move them as they were.'
      }))
    })
    if (stopped(lows)) return [...has, ...lows]
    const { names } = await exportsOf(t, dir, STOCK)
    const shopText = await sourceOf(t, SHOP)
    const copies = ['isLow', 'inStock', 'lowStock'].filter((fn) => declares(shopText, fn))
    const run = await shopPrints(t, others(t, [], { [STOCK]: t.chapterPath('grader/marked-stock.js') }), 'from stock.js', {
      file: STOCK,
      name: 'lowStock'
    })
    return [
      ...has,
      ...lows,
      shape(
        'isLow stays in stock.js',
        !names || !('isLow' in names),
        'isLow only helps lowStock inside stock.js, so it is not exported: keep it off the export line, with no export in front of it.'
      ),
      shape(
        'shop.js keeps no copy of the stock rules',
        copies.length === 0,
        `shop.js still has ${copies.join(' and ')}. A function lives in one file: remove it from shop.js and import what shop.js uses from stock.js.`
      ),
      run.problem ?? {
        name: 'shop.js uses the rules in stock.js',
        passed: run.has,
        message: run.has
          ? undefined
          : 'Check put a stock.js of its own beside shop.js, and shop.js did not use it. Import lowStock from stock.js in shop.js.',
        output: run.printed
      }
    ]
  },

  async settings(t) {
    const problem = await needs(t, [
      [STOCK, 'Task 2 puts the stock rules in a file with exactly that name, beside shop.js.'],
      [SETTINGS, 'settings.js came with the site: put it back with that name, as it was.']
    ])
    if (problem) return [problem]
    const given = await readFile(t.chapterPath('starter/src/settings.js'), 'utf8')
    const now = await readFile(`${t.workspace}/${SETTINGS}`, 'utf8')
    const flat = (s) => s.replace(/\s+/g, '')
    const kept = shape(
      'settings.js is as it came',
      flat(given) === flat(now),
      'settings.js changed. It came with the site, so leave it as it was and import from it as it is: the lesson shows how a default export is imported.'
    )
    if (!kept.passed) return [kept]
    const run = (settings) =>
      prepare(t, {
        swaps: others(t, [STOCK, SETTINGS], { [SETTINGS]: t.chapterPath(`grader/${settings}.js`) })
      }).then((dir) =>
        cases(t, dir, {
          file: STOCK,
          fn: 'lowStock',
          absent: 'stock.js has no lowStock that it exports yet. Task 2 moves it there; get that task passing first.',
          list: [
            {
              name: `lowStock follows lowAt in settings.js (${settings === 'settings-wide' ? 'a larger' : 'a smaller'} number)`,
              args: [shelf],
              expected: low(shelf, settings === 'settings-wide' ? 5 : 1),
              hint: 'lowStock gives a different list than the settings ask for. isLow should count a candle as low when it has at least one, and no more than lowAt.',
              explain: (r) =>
                r.value && same(r.value, low(shelf, 3))
                  ? 'Check changed lowAt in settings.js, and lowStock still counts up to 3. Import the settings in stock.js and use their lowAt in isLow.'
                  : undefined
            }
          ]
        })
      )
    const [wide, narrow] = await Promise.all([run('settings-wide'), run('settings-narrow')])
    if (stopped(wide)) return wide
    return [...wide, ...narrow, kept]
  },

  async page(t) {
    const problem = await needs(t, [
      [PAGE, 'Task 4 puts the page in a file with exactly that name, beside shop.js.'],
      [SHOP, 'Keep shop.js in the src folder, with that name.']
    ])
    if (problem) return [problem]
    const pageText = await sourceOf(t, PAGE)
    const absent = declares(pageText, 'pageLines')
      ? 'page.js has pageLines, but does not export it, and shop.js needs it. Export it.'
      : 'Check cannot find pageLines in page.js. Move it here from shop.js with the same name.'
    const candles = [
      { name: 'Juniper', stock: 0 },
      { name: 'Rhubarb', stock: 5 },
      { name: 'Linden', stock: 2 }
    ]
    const right = await cases(
      t,
      await prepare(t, { swaps: others(t, [PAGE], { [SETTINGS]: t.chapterPath('grader/settings-wide.js') }) }),
      {
        file: PAGE,
        fn: 'pageLines',
        absent,
        list: [
          { name: 'pageLines for candles of its own', args: [candles], expected: ['Test shop', ...candles.map((c) => line(c))] },
          { name: 'pageLines with no candles', args: [[]], expected: ['Test shop'] }
        ].map((c) => ({
          ...c,
          hint: 'The page is the shop name, then one line per candle as productLine writes it.',
          explain: (r) =>
            Array.isArray(r.value) && r.value[0] === 'Wickhollow Candles'
              ? 'Check changed shopName in settings.js, and the page still starts with the name typed in. Import the settings in page.js and start the page with their shopName.'
              : undefined
        }))
      }
    )
    if (stopped(right)) return right
    const marked = await cases(
      t,
      await prepare(t, { swaps: others(t, [PAGE], { [STOCK]: t.chapterPath('grader/marked-stock.js') }) }),
      {
        file: PAGE,
        fn: 'pageLines',
        absent,
        list: [{ name: 'marked', args: [[{ name: 'Juniper', stock: 0 }]], expected: ['Wickhollow Candles', 'Juniper: 0 left'] }]
      }
    )
    const shopText = await sourceOf(t, SHOP)
    const run = await shopPrints(t, others(t, [], { [PAGE]: t.chapterPath('grader/marked-page.js') }), 'from page.js', {
      file: PAGE,
      name: 'pageLines'
    })
    return [
      ...right,
      shape(
        'page.js uses inStock from stock.js',
        marked[0].passed || !right.every((d) => d.passed),
        declares(pageText, 'inStock')
          ? 'page.js has an inStock of its own, a copy of the one in stock.js. Remove it and import inStock from stock.js.'
          : 'page.js decides whether a candle is in stock some other way than with inStock from stock.js. Import inStock from stock.js and use it in productLine.'
      ),
      shape(
        'shop.js keeps no function of its own',
        !/^(?:export\s+)?(?:async\s+)?function\b/m.test(shopText),
        'shop.js still has a function in it. When the page has moved, shop.js keeps only its imports and the two lines that print.'
      ),
      run.problem ?? {
        name: 'shop.js uses the page in page.js',
        passed: run.has,
        message: run.has
          ? undefined
          : 'Check put a page.js of its own beside shop.js, and shop.js did not use it. Import pageLines from page.js in shop.js.',
        output: run.printed
      }
    ]
  }
}

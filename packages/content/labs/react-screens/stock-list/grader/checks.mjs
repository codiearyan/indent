import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { stock } from './stock.mjs'

const SOLD = stock.filter((record) => record.sold).map((record) => record.title)

const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})

const source = (t, file) => readFile(join(t.workspace, file), 'utf8').catch(() => '')

function pageError(page) {
  if (!page.errors.length) return null
  return detail(
    'The page runs without errors',
    false,
    'The page stopped with an error before it could be checked. Open the console in the Browser panel and read the first error.',
    page.errors.join('\n')
  )
}

/** The whole app, with a stock the learner's code has never seen. */
async function stockPage(t) {
  const dir = await t.sandbox({ 'src/stock.js': t.chapterPath('grader/stock.mjs') })
  return t.page('index.html', { dir })
}

/** A page that renders one component on its own, so the check can hand it any props. */
async function harness(t, file, name) {
  const dir = await t.sandbox()
  await mkdir(join(dir, '.grader'), { recursive: true })
  await writeFile(
    join(dir, '.grader/harness.html'),
    '<!doctype html><div id="root"></div><script type="module" src="harness.jsx"></script>'
  )
  await writeFile(
    join(dir, '.grader/harness.jsx'),
    `import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import * as mod from '../${file}'
const Component = mod.${name} ?? mod.default
window.found = typeof Component
const root = createRoot(document.getElementById('root'))
window.show = (props) => flushSync(() => root.render(<Component {...props} />))
`
  )
  return t.page('.grader/harness.html', { dir })
}

const titles = (page) => page.$$('.record-card h3').map((h) => h.textContent.trim())

async function component(t, file, name) {
  if (!existsSync(join(t.workspace, file))) {
    return { failed: detail(`${file} exists`, false, `There is no ${file}. Create it in src/.`) }
  }
  const page = await harness(t, file, name)
  if (page.errors.length || page.window.found !== 'function') {
    return {
      failed: detail(
        `${file} exports ${name}`,
        false,
        `${file} should export a component called ${name}. Check the export line and the console for errors.`,
        page.errors.join('\n')
      )
    }
  }
  return { page, ok: detail(`${file} exports ${name}`, true) }
}

export const checks = {
  async 'record-card'(t) {
    const { page, ok, failed } = await component(t, 'src/RecordCard.jsx', 'RecordCard')
    if (failed) return [failed]
    const results = [ok]

    for (const record of [stock[3], stock[0]]) {
      page.window.show({ record })
      const card = page.$('.record-card')
      const text = card ? card.textContent.replace(/\s+/g, ' ') : ''
      const title = card?.querySelector('h3')?.textContent.trim()
      const price = `$${record.price.toFixed(2)}`
      const passed =
        title === record.title &&
        text.includes(record.artist) &&
        text.includes(String(record.year)) &&
        text.includes(price)
      results.push(
        detail(
          `Shows the record it is given (${record.title})`,
          passed,
          card
            ? 'The card did not show this record. Every value should come from the record prop: the title in the h3, the artist, the year and the price through formatPrice.'
            : 'Nothing with the class record-card appeared. The component should return an article with that class.',
          card ? `h3: ${title ?? '(none)'}\ntext: ${text.trim()}` : page.$('#root').innerHTML || '(empty)'
        )
      )
    }

    const list = await source(t, 'src/StockList.jsx')
    results.push(
      detail(
        'The stock list uses RecordCard',
        /<RecordCard\b/.test(list),
        'StockList.jsx should draw each record with the RecordCard component.'
      )
    )
    return results
  },

  async 'stock-list'(t) {
    const { page: alone, ok, failed } = await component(t, 'src/StockList.jsx', 'StockList')
    if (failed) return [failed]
    const app = await source(t, 'src/App.jsx')
    const results = [
      ok,
      detail(
        'App uses StockList',
        /<StockList\b/.test(app),
        'App.jsx should hand the stock to the StockList component instead of writing cards by hand.'
      )
    ]

    const page = await stockPage(t)
    const broken = pageError(page)
    if (broken) return [...results, broken]
    const shown = titles(page)
    const expected = stock.map((record) => record.title)
    results.push(
      detail(
        'Shows every record of the stock, in order',
        JSON.stringify(shown) === JSON.stringify(expected),
        'The check swapped in a different stock and the screen did not follow it. The list should come from the records prop, one card per record.',
        `expected: ${expected.join(', ')}\nshown: ${shown.join(', ') || '(nothing)'}`
      )
    )
    const items = page.$$('ul.stock-list > li')
    results.push(
      detail(
        'One li per record inside ul.stock-list',
        items.length === stock.length,
        'Each card should sit in its own li inside a ul with the class stock-list.',
        `li elements found: ${items.length}`
      )
    )
    const warnings = page.logs.filter((line) => /key/i.test(line) && /^(error|warn)/.test(line))
    results.push(
      detail(
        'React has no complaint about keys',
        warnings.length === 0,
        'React warned about keys in the console. Each item made inside map needs a key.',
        warnings.join('\n')
      )
    )

    const [a, b, c] = stock
    alone.window.show({ records: [a, b, c] })
    const itemOf = (title) =>
      alone.$$('h3').find((h) => h.textContent.trim() === title)?.closest('li')
    for (const record of [a, b, c]) {
      const li = itemOf(record.title)
      if (li) li.graderMark = record.id
    }
    alone.window.show({ records: [c, a, b] })
    const kept = [a, b, c].every((record) => itemOf(record.title)?.graderMark === record.id)
    results.push(
      detail(
        'Keys stay with their records when the order changes',
        kept,
        'When the check reordered the records, React reused the items by position. A key should belong to the record itself, not to its place in the list.',
        [a, b, c]
          .map((record) => `${record.title}: ${itemOf(record.title)?.graderMark ?? 'a different item'}`)
          .join('\n')
      )
    )
    return results
  },

  async 'sold-mark'(t) {
    const { page, ok, failed } = await component(t, 'src/RecordCard.jsx', 'RecordCard')
    if (failed) return [failed]
    const results = [ok]

    const sold = stock.find((record) => record.sold)
    page.window.show({ record: sold })
    const mark = page.$('.record-card .sold-mark')
    results.push(
      detail(
        'A sold record shows the Sold mark',
        mark?.textContent.trim() === 'Sold',
        'A record with sold: true should show an element with the class sold-mark that reads Sold.',
        page.$('#root').innerHTML || '(empty)'
      )
    )

    const unsold = stock.find((record) => !record.sold)
    page.window.show({ record: unsold })
    const card = page.$('.record-card')
    results.push(
      detail(
        'A record still in the racks has no Sold mark',
        Boolean(card) && !card.querySelector('.sold-mark') && !/\bSold\b/.test(card.textContent),
        'A record with sold: false should not show the mark at all. Decide in the JSX whether to render it.',
        card ? card.textContent.replace(/\s+/g, ' ').trim() : '(no card)'
      )
    )

    const screen = await stockPage(t)
    const broken = pageError(screen)
    if (broken) return [...results, broken]
    const marked = screen
      .$$('.record-card')
      .filter((c) => c.querySelector('.sold-mark'))
      .map((c) => c.querySelector('h3')?.textContent.trim())
    results.push(
      detail(
        'On the screen only the sold records are marked',
        JSON.stringify(marked) === JSON.stringify(SOLD),
        'The check used a stock with different sold records. The marks on the screen should follow the data.',
        `expected: ${SOLD.join(', ')}\nmarked: ${marked.join(', ') || '(none)'}`
      )
    )
    return results
  }
}

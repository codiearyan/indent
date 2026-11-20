import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { stock } from './stock.mjs'

const ALL = stock.map((record) => record.title)
const GENRES = [...new Set(stock.map((record) => record.genre))].sort()

const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})

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
  const page = await t.page('index.html', { dir })
  return { page, broken: pageError(page) ?? missing(page) }
}

function missing(page) {
  for (const [selector, what] of [
    ['#search', 'an input with the id search'],
    ['#genre', 'a select with the id genre']
  ]) {
    if (!page.$(selector)) {
      return detail(`The page has ${what}`, false, `The check could not find ${what}.`)
    }
  }
  return null
}

const titles = (page) => page.$$('.record-card h3').map((h) => h.textContent.trim())
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const clearButton = (page) => page.$$('button').find((b) => b.textContent.trim() === 'Clear')

function listDetail(page, name, expected, message) {
  const shown = titles(page)
  return detail(
    name,
    same(shown, expected),
    message,
    `expected: ${expected.join(', ') || '(nothing)'}\nshown: ${shown.join(', ') || '(nothing)'}`
  )
}

export const checks = {
  async 'search-box'(t) {
    const { page, broken } = await stockPage(t)
    if (broken) return [broken]
    const moth = ['Mothlight Parade', 'The Moth Variations']

    await page.type('#search', 'moth')
    const results = [
      listDetail(
        page,
        'Typing moth shows only the matching titles',
        moth,
        'The list should keep only the records whose title or artist contains the text in the search box.'
      )
    ]
    await page.type('#search', '  MOTH ')
    results.push(
      listDetail(
        page,
        'Ignores capitals and spaces around the text',
        moth,
        'Compare both sides in lower case, and trim the spaces around what was typed.'
      )
    )
    await page.type('#search', 'ware')
    results.push(
      listDetail(
        page,
        'Matches the artist too',
        ['Seven Quiet Rooms'],
        'A record should also match when the text is part of its artist.'
      )
    )

    const button = clearButton(page)
    if (button) await page.click(button)
    const value = page.$('#search').value
    results.push(
      detail(
        'Clear empties the box and shows every record',
        Boolean(button) && value === '' && same(titles(page), ALL),
        'After Clear the search box should be empty and every record back. If the list came back but the box still shows text, the box is not reading its value from state.',
        `search box: "${value}"\nshown: ${titles(page).join(', ')}`
      )
    )
    return results
  },

  async 'genre-filter'(t) {
    const { page, broken } = await stockPage(t)
    if (broken) return [broken]
    const options = page.$$('#genre option').map((o) => `${o.value}=${o.textContent.trim()}`)
    const expected = ['all=All genres', ...GENRES.map((genre) => `${genre}=${genre}`)]
    const results = [
      detail(
        'The select lists All genres, then every genre of the stock',
        same(options, expected),
        'The check used a stock with other genres. The options should be worked out from the stock: each genre once, sorted, after All genres.',
        `expected: ${expected.join(', ')}\nfound: ${options.join(', ')}`
      )
    ]
    if (!results[0].passed) return results

    await page.type('#genre', 'Jazz')
    results.push(
      listDetail(
        page,
        'Picking Jazz shows only jazz',
        ['Seven Quiet Rooms'],
        'Picking a genre should keep only the records of that genre.'
      )
    )
    await page.type('#genre', 'Reggae')
    await page.type('#search', 'moth')
    results.push(
      listDetail(
        page,
        'Genre and search work together',
        ['Mothlight Parade'],
        'With a genre picked and text typed, a record has to pass both tests to be shown.'
      )
    )
    await page.type('#genre', 'all')
    results.push(
      listDetail(
        page,
        'All genres brings every genre back',
        ['Mothlight Parade', 'The Moth Variations'],
        'With All genres picked only the search should narrow the list.'
      )
    )

    await page.type('#genre', 'Folk')
    const button = clearButton(page)
    if (button) await page.click(button)
    results.push(
      detail(
        'Clear puts the select back to All genres',
        page.$('#genre').value === 'all' && same(titles(page), ALL),
        'Clear should reset the genre as well as the search, and the select should show it.',
        `select: ${page.$('#genre').value}\nshown: ${titles(page).join(', ')}`
      )
    )
    return results
  },

  async 'result-count'(t) {
    const { page, broken } = await stockPage(t)
    if (broken) return [broken]
    const count = () => page.$('.result-count')?.textContent.replace(/\s+/g, ' ').trim() ?? '(none)'
    const total = stock.length

    const results = [
      detail(
        `Reads Showing ${total} of ${total} records at first`,
        count() === `Showing ${total} of ${total} records`,
        'There should be an element with the class result-count that reads Showing N of M records.',
        `result-count: ${count()}`
      )
    ]
    await page.type('#search', 'moth')
    results.push(
      detail(
        'Follows the search',
        count() === `Showing 2 of ${total} records`,
        'The first number is how many records are visible, the second how many the stock has.',
        `result-count: ${count()}`
      )
    )
    await page.type('#search', 'qqqq')
    const empty = page.$('.empty-line')?.textContent.trim()
    results.push(
      detail(
        'Says No records match. when nothing matches',
        empty === 'No records match.' && titles(page).length === 0,
        'When no record matches, show a line with the class empty-line that reads No records match. in place of the list.',
        `empty-line: ${empty ?? '(none)'}\ncards: ${titles(page).length}`
      )
    )

    const dir = join(t.workspace, 'src')
    const files = (await readdir(dir)).filter((f) => /\.jsx?$/.test(f))
    const withEffect = []
    for (const file of files) {
      if (/useEffect/.test(await readFile(join(dir, file), 'utf8'))) withEffect.push(file)
    }
    results.push(
      detail(
        'The visible list is worked out during render',
        withEffect.length === 0,
        'The visible list can be worked out from the stock, the search text and the genre every time App renders. It needs no effect and no state of its own.',
        `useEffect found in: ${withEffect.join(', ')}`
      )
    )
    return results
  }
}

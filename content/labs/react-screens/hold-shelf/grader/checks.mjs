import { stock } from './stock.mjs'

const byId = (id) => stock.find((record) => record.id === id)
const [FIRST, SECOND, THIRD] = ['gr-03', 'gr-01', 'gr-06'].map(byId)

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
  return t.page('index.html', { dir })
}

const cardOf = (page, record) =>
  page.$$('.record-card').find((card) => card.querySelector('h3')?.textContent.trim() === record.title)

const buttonOf = (page, record) => cardOf(page, record)?.querySelector('.hold-button')

const label = (page, record) => buttonOf(page, record)?.textContent.trim() ?? '(no .hold-button)'

const shelf = (page) =>
  page.$$('.hold-shelf li').map((li) => li.textContent.replace(/\s+/g, ' ').trim())

const onShelf = (page, record) => shelf(page).some((line) => line.includes(record.title))

const shelfOutput = (page) => `hold shelf: ${shelf(page).join(' | ') || '(empty)'}`

async function toggle(page, record) {
  const button = buttonOf(page, record)
  if (button) await page.click(button)
}

export const checks = {
  async 'hold-a-record'(t) {
    const page = await stockPage(t)
    const broken = pageError(page)
    if (broken) return [broken]
    if (!buttonOf(page, FIRST)) {
      return [
        detail(
          'Every card has a hold button',
          false,
          'The check could not find a button with the class hold-button on the cards.'
        )
      ]
    }

    await toggle(page, FIRST)
    const results = [
      detail(
        `Hold puts ${FIRST.title} on the shelf`,
        onShelf(page, FIRST),
        'After clicking Hold the record did not appear on the hold shelf. The click should change state in App, and the shelf should be worked out from that state.',
        shelfOutput(page)
      )
    ]

    await toggle(page, SECOND)
    results.push(
      detail(
        'A second hold adds to the shelf',
        onShelf(page, FIRST) && onShelf(page, SECOND),
        'After a second Hold both records should be on the shelf. Make a new array that has the old ids plus the new one.',
        shelfOutput(page)
      )
    )

    await toggle(page, THIRD)
    results.push(
      detail(
        'A third hold keeps the other two',
        [FIRST, SECOND, THIRD].every((record) => onShelf(page, record)) && shelf(page).length === 3,
        'After three holds the shelf should list exactly those three records.',
        shelfOutput(page)
      ),
      detail(
        'The stock list still shows every record',
        page.$$('.record-card').length === stock.length,
        'Holding a record should not take it out of the stock list.',
        `cards: ${page.$$('.record-card').length}`
      )
    )
    return results
  },

  async release(t) {
    const page = await stockPage(t)
    const broken = pageError(page)
    if (broken) return [broken]

    const before = label(page, FIRST)
    await toggle(page, FIRST)
    const after = label(page, FIRST)
    const results = [
      detail(
        'The button reads Hold, then Release',
        before === 'Hold' && after === 'Release',
        'The label should follow the state: Hold when the record is not on the shelf, Release when it is.',
        `before the click: ${before}\nafter the click: ${after}`
      )
    ]

    await toggle(page, SECOND)
    await toggle(page, FIRST)
    results.push(
      detail(
        'Release takes the record off the shelf',
        !onShelf(page, FIRST) && label(page, FIRST) === 'Hold',
        'Clicking Release should remove that record from the shelf and turn its button back to Hold.',
        `${shelfOutput(page)}\nbutton: ${label(page, FIRST)}`
      ),
      detail(
        'Releasing one record keeps the others',
        onShelf(page, SECOND) && label(page, SECOND) === 'Release',
        'Only the released record should leave the shelf. Keep every other id when you build the new array.',
        shelfOutput(page)
      )
    )
    return results
  },

  async 'shelf-count'(t) {
    const page = await stockPage(t)
    const broken = pageError(page)
    if (broken) return [broken]
    const count = () => page.$('.hold-count')?.textContent.replace(/\s+/g, ' ').trim() ?? '(none)'

    const results = [
      detail(
        'Starts at 0 on hold',
        count() === '0 on hold',
        'The header should have an element with the class hold-count that reads 0 on hold when the shelf is empty.',
        `hold-count: ${count()}`
      )
    ]
    await toggle(page, FIRST)
    results.push(
      detail(
        'Reads 1 on hold after one hold',
        count() === '1 on hold',
        'The count should come from the same state as the shelf, not be typed in.',
        `hold-count: ${count()}`
      )
    )
    await toggle(page, SECOND)
    await toggle(page, THIRD)
    results.push(
      detail(
        'Reads 3 on hold after three holds',
        count() === '3 on hold',
        'The count should follow every change to the shelf.',
        `hold-count: ${count()}`
      )
    )
    return results
  }
}

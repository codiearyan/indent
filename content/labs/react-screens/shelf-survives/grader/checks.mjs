import { stock } from './stock.mjs'

const KEY = 'sidewinder.hold'
const byId = (id) => stock.find((record) => record.id === id)
const [FIRST, SECOND] = ['gr-03', 'gr-06'].map(byId)

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

/** The whole app, with a stock the learner's code has never seen and the given saved values. */
async function stockPage(t, storage = {}) {
  const dir = await t.sandbox({ 'src/stock.js': t.chapterPath('grader/stock.mjs') })
  return t.page('index.html', { dir, storage })
}

const cardOf = (page, record) =>
  page.$$('.record-card').find((card) => card.querySelector('h3')?.textContent.trim() === record.title)

const label = (page, record) =>
  cardOf(page, record)?.querySelector('.hold-button')?.textContent.trim() ?? '(no .hold-button)'

async function toggle(page, record) {
  const button = cardOf(page, record)?.querySelector('.hold-button')
  if (button) await page.click(button)
}

const shelf = (page) =>
  page.$$('.hold-shelf li').map((li) => li.textContent.replace(/\s+/g, ' ').trim())

const count = (page) => page.$('.hold-count')?.textContent.replace(/\s+/g, ' ').trim() ?? '(none)'

const screenOutput = (page) =>
  `hold shelf: ${shelf(page).join(' | ') || '(empty)'}\nhold-count: ${count(page)}`

function saved(page) {
  const raw = page.window.localStorage.getItem(KEY)
  try {
    return { raw, ids: JSON.parse(raw) }
  } catch {
    return { raw, ids: null }
  }
}

const sameIds = (ids, expected) =>
  Array.isArray(ids) && JSON.stringify([...ids].sort()) === JSON.stringify([...expected].sort())

export const checks = {
  async 'read-saved-shelf'(t) {
    const page = await stockPage(t, { [KEY]: JSON.stringify([FIRST.id, SECOND.id]) })
    const broken = pageError(page)
    if (broken) return [broken]
    const onShelf = (record) => shelf(page).some((line) => line.includes(record.title))

    const results = [
      detail(
        'A saved shelf is back after a reload',
        onShelf(FIRST) && onShelf(SECOND) && shelf(page).length === 2 && count(page) === '2 on hold',
        `The check saved two ids under ${KEY} before the page opened. The shelf should start with them.`,
        `${KEY}: ${JSON.stringify([FIRST.id, SECOND.id])}\n${screenOutput(page)}`
      ),
      detail(
        'Their buttons read Release',
        label(page, FIRST) === 'Release' && label(page, SECOND) === 'Release',
        'The cards read from the same state as the shelf, so restored records should show Release.',
        `${FIRST.title}: ${label(page, FIRST)}\n${SECOND.title}: ${label(page, SECOND)}`
      )
    ]

    const garbled = await stockPage(t, { [KEY]: '{not json' })
    results.push(
      detail(
        'A damaged saved value gives an empty shelf, not a crash',
        garbled.errors.length === 0 && count(garbled) === '0 on hold',
        'When the saved text is not valid JSON, JSON.parse throws. Catch that and start with an empty shelf.',
        garbled.errors.join('\n') || screenOutput(garbled)
      )
    )

    const fresh = await stockPage(t)
    results.push(
      detail(
        'Nothing saved gives an empty shelf',
        fresh.errors.length === 0 && count(fresh) === '0 on hold' && shelf(fresh).length === 0,
        'On a first visit nothing is saved and getItem returns null. The shelf should start empty.',
        fresh.errors.join('\n') || screenOutput(fresh)
      )
    )
    return results
  },

  async 'save-shelf'(t) {
    const page = await stockPage(t)
    const broken = pageError(page)
    if (broken) return [broken]

    await toggle(page, FIRST)
    await toggle(page, SECOND)
    const afterHolds = saved(page)
    const results = [
      detail(
        'Holding records saves their ids',
        sameIds(afterHolds.ids, [FIRST.id, SECOND.id]),
        `After two holds, localStorage should hold a JSON array of the two record ids under ${KEY}.`,
        `${KEY}: ${afterHolds.raw ?? '(nothing saved)'}`
      )
    ]

    await toggle(page, FIRST)
    const afterRelease = saved(page)
    results.push(
      detail(
        'Releasing a record saves again',
        sameIds(afterRelease.ids, [SECOND.id]),
        'The saved value should follow every change to the shelf, releases too.',
        `${KEY}: ${afterRelease.raw ?? '(nothing saved)'}`
      )
    )

    const reopened = await stockPage(t, { [KEY]: afterRelease.raw ?? '' })
    results.push(
      detail(
        'The saved value brings the shelf back',
        reopened.errors.length === 0 &&
          count(reopened) === '1 on hold' &&
          shelf(reopened).some((line) => line.includes(SECOND.title)),
        'The check opened the page again with what your code saved. The shelf should look the same as before.',
        reopened.errors.join('\n') || screenOutput(reopened)
      )
    )
    return results
  },

  async 'escape-closes'(t) {
    const page = await stockPage(t)
    const broken = pageError(page)
    if (broken) return [broken]
    const panelTitle = () => page.$('.details-panel h2')?.textContent.trim() ?? null
    const open = async (record) => {
      const button = cardOf(page, record)?.querySelector('.title-button')
      if (button) await page.click(button)
    }

    // Count keydown listeners added and removed from here on, by identity.
    const live = new Set()
    for (const target of [page.window, page.document]) {
      const add = target.addEventListener.bind(target)
      const remove = target.removeEventListener.bind(target)
      target.addEventListener = (type, listener, options) => {
        if (type === 'keydown') live.add(listener)
        return add(type, listener, options)
      }
      target.removeEventListener = (type, listener, options) => {
        if (type === 'keydown') live.delete(listener)
        return remove(type, listener, options)
      }
    }

    await page.press('body', 'Escape')
    const quiet = page.errors.length === 0
    await open(FIRST)
    const opened = panelTitle()
    await page.press('body', 'Enter')
    const stayed = panelTitle()
    await page.press('body', 'Escape')
    const results = [
      detail(
        'Escape closes the details panel',
        opened === FIRST.title && stayed === FIRST.title && panelTitle() === null && quiet,
        'Open a record, press Escape anywhere on the page and the panel should close. Other keys should leave it open.',
        `after opening: ${opened ?? '(no panel)'}\nafter Enter: ${stayed ?? '(no panel)'}\nafter Escape: ${panelTitle() ?? '(no panel)'}\n${page.errors.join('\n')}`
      )
    ]

    await open(SECOND)
    const closeButton = page.$$('.details-panel button').find((b) => b.textContent.trim() === 'Close')
    if (closeButton) await page.click(closeButton)
    results.push(
      detail(
        'The Close button still works',
        panelTitle() === null,
        'Clicking Close should still close the panel.',
        `after Close: ${panelTitle() ?? '(no panel)'}`
      )
    )

    for (const record of [FIRST, SECOND, FIRST]) {
      await open(record)
      await page.press('body', 'Escape')
    }
    results.push(
      detail(
        'The keydown listener is cleaned up',
        live.size <= 1 && panelTitle() === null,
        'After opening and closing the panel several times, old keydown listeners were still attached. Return a cleanup function from the effect that removes the listener it added.',
        `keydown listeners still attached: ${live.size}`
      )
    )
    return results
  }
}

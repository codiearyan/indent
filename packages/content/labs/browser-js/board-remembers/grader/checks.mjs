import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// The checks answer the page's fetch with routes of their own, so a board that still reads
// the old src/routes.js cannot pass.
const HIDDEN = [
  { id: 'g-41', name: 'Quartz Ladder', grade: 'V1', colour: 'Green', setter: 'Noor' },
  { id: 'g-42', name: 'Pocket <Rocket>', grade: 'V4', colour: 'Blue', setter: 'Tobias' },
  { id: 'g-43', name: 'Overhang Eleven', grade: 'V10', colour: 'Black', setter: 'Maren' },
  { id: 'g-44', name: 'Soft Landing', grade: 'V2', colour: 'Pink', setter: 'Ilse' },
  { id: 'g-45', name: 'Sidepull Saga', grade: 'V6', colour: 'Purple', setter: 'Noor' },
  { id: 'g-46', name: 'Wide Side Story', grade: 'V5', colour: 'Orange', setter: 'Desmond' }
]
const KEY = 'gritstone-ticks'
const DELAY = 120

// The kit has no unhandledRejection handler, so a page promise nobody catches would crash the
// whole grader. Collect them here and report them as a failed detail instead.
const stray = []
process.on('unhandledRejection', (reason) => stray.push(String(reason?.message ?? reason)))

const answers = {
  ok: () => new Response(JSON.stringify(HIDDEN), { headers: { 'content-type': 'application/json' } }),
  serverError: () => new Response('Something broke', { status: 500 }),
  offline: () => {
    throw new TypeError('Failed to fetch')
  }
}

async function open(t, { answer = answers.ok, storage } = {}) {
  const dir = await t.sandbox({ '.grader/spy.js': t.chapterPath('grader/spy.js') })
  const html = await readFile(join(dir, 'index.html'), 'utf8')
  await writeFile(
    join(dir, 'index.html'),
    html.replace(/<script\b/, '<script src=".grader/spy.js"></script>\n    <script')
  )
  const asked = []
  const page = await t.page('index.html', {
    dir,
    storage,
    fetch: async (input) => {
      asked.push(String(input?.url ?? input))
      await new Promise((done) => setTimeout(done, DELAY))
      return answer()
    }
  })
  await page.settle(DELAY + 50)
  page.asked = asked
  return page
}

const clean = (text) => (text ?? '').replace(/\s+/g, ' ').trim()
const isShown = (page, element) =>
  !!element && !element.closest('[hidden]') && page.style(element).display !== 'none'
const names = (page) => page.$$('#route-list > li').map((item) => item.querySelector('.route-name')?.textContent)
const count = (page) => clean(page.$('#tick-count')?.textContent)
const pressed = (page, id) =>
  page.$(`#route-list li[data-id="${id}"] .tick`)?.getAttribute('aria-pressed') ?? null
const statusLine = (page) => {
  const status = page.$('#board-status')
  return status ? `#board-status visible: ${isShown(page, status)}, text: "${clean(status.textContent)}"` : 'no #board-status'
}
const stored = (page) => {
  const raw = page.window.localStorage.getItem(KEY)
  try {
    const ids = JSON.parse(raw)
    return { raw, ids: Array.isArray(ids) ? ids : null }
  } catch {
    return { raw, ids: null }
  }
}

function runs(page) {
  return {
    name: 'The page runs without errors',
    passed: page.errors.length === 0,
    message: 'The page threw an error. Open the console in the Browser panel and read the first one.',
    output: page.errors.join('\n')
  }
}

async function clickTick(page, id) {
  const button = page.$(`#route-list li[data-id="${id}"] .tick`)
  if (button) await page.click(button)
}

export const checks = {
  async 'load-routes'(t) {
    const page = await open(t)
    const seen = page.window.__statusSeen?.[0]
    const status = page.$('#board-status')
    const statusDone = !status || !isShown(page, status) || clean(status.textContent) === ''
    return [
      runs(page),
      {
        name: 'Asks for data/routes.json',
        passed: page.asked.some((url) => /(^|\/)data\/routes\.json$/.test(url)),
        message: 'The page should fetch data/routes.json, with a path relative to the page.',
        output: page.asked.length ? `fetched: ${page.asked.join(', ')}` : 'the page never called fetch'
      },
      {
        name: 'Shows a loading line while it waits',
        passed: !!seen && !seen.hidden && /loading/i.test(seen.text),
        message: 'While the routes are on their way, #board-status should be visible and say that the routes are loading. Show it before you fetch.',
        output: seen ? `when the answer arrived #board-status was visible: ${!seen.hidden}, text: "${seen.text}"` : 'no fetch was seen, or no #board-status'
      },
      {
        name: 'Draws the routes from the file',
        passed: JSON.stringify(names(page)) === JSON.stringify(HIDDEN.map((route) => route.name)),
        message: 'The board should show the routes that came back from the fetch, in their order, not the old list in src/routes.js.',
        output: `expected ${HIDDEN.map((route) => route.name).join(', ')}\ngot      ${names(page).join(', ') || '(nothing)'}`
      },
      {
        name: 'The loading line goes away',
        passed: statusDone,
        message: 'Once the routes are on the board, hide #board-status again.',
        output: statusLine(page)
      },
      {
        name: 'The count covers the loaded routes',
        passed: count(page) === `0 of ${HIDDEN.length} ticked`,
        message: 'Draw the board and the count again once the routes have arrived.',
        output: `#tick-count: "${count(page)}"`
      }
    ]
  },

  async 'load-failure'(t) {
    const before = stray.length
    const broken = await open(t, { answer: answers.serverError })
    const offline = await open(t, { answer: answers.offline })
    const says = (page) => isShown(page, page.$('#board-status')) && /could not load/i.test(page.$('#board-status').textContent)
    const fresh = stray.slice(before)
    return [
      {
        name: 'A server error is explained',
        passed: says(broken),
        message: 'The file answered with status 500. fetch does not throw for that, so check the response yourself and show a line in #board-status that contains "Could not load".',
        output: statusLine(broken)
      },
      {
        name: 'A lost connection is explained',
        passed: says(offline),
        message: 'fetch itself failed, as it does with no network. Catch that and show the same kind of line in #board-status.',
        output: statusLine(offline)
      },
      {
        name: 'The failure is handled, not thrown',
        passed: broken.errors.length === 0 && offline.errors.length === 0 && fresh.length === 0,
        message: 'An error escaped to the console. Wrap the loading in try and catch, so the page tells people what happened instead.',
        output: [...broken.errors, ...offline.errors, ...fresh].join('\n')
      }
    ]
  },

  async 'remember-ticks'(t) {
    const page = await open(t, { storage: { [KEY]: JSON.stringify(['g-42', 'g-45', 'g-99']) } })
    const restored = ['g-41', 'g-42', 'g-43', 'g-44', 'g-45', 'g-46'].map((id) => `${id}: ${pressed(page, id)}`)
    const restoredOk =
      pressed(page, 'g-42') === 'true' &&
      pressed(page, 'g-45') === 'true' &&
      ['g-41', 'g-43', 'g-44', 'g-46'].every((id) => pressed(page, id) === 'false')
    const restoredCount = count(page)
    await clickTick(page, 'g-41')
    const afterTick = stored(page)
    await clickTick(page, 'g-42')
    const afterUntick = stored(page)

    const blank = await open(t)
    await clickTick(blank, 'g-43')
    const first = stored(blank)

    const broken = await open(t, { storage: { [KEY]: '{oops' } })
    return [
      runs(page),
      {
        name: 'Saved ticks come back on load',
        passed: restoredOk,
        message: `With ${KEY} holding ["g-42","g-45","g-99"], those routes should load ticked and the rest not.`,
        output: restored.join('\n')
      },
      {
        name: 'The count ignores routes that left the wall',
        passed: restoredCount === `2 of ${HIDDEN.length} ticked`,
        message: 'g-99 is saved but no longer on the board, so it should not be counted.',
        output: `#tick-count: "${restoredCount}"`
      },
      {
        name: 'A tick is saved',
        passed: !!first.ids?.includes('g-43') && !!afterTick.ids?.includes('g-41'),
        message: `After a click on a tick, localStorage should hold the ticked ids under "${KEY}" as a JSON array.`,
        output: `fresh page after ticking g-43: ${first.raw}\nafter ticking g-41: ${afterTick.raw}`
      },
      {
        name: 'An untick is saved',
        passed: !!afterUntick.ids && !afterUntick.ids.includes('g-42') && afterUntick.ids.includes('g-45'),
        message: 'After unticking a route, its id should be gone from the saved list and the others should stay.',
        output: `after unticking g-42: ${afterUntick.raw}`
      },
      {
        name: 'A damaged save does not break the board',
        passed:
          broken.errors.length === 0 &&
          names(broken).length === HIDDEN.length &&
          count(broken) === `0 of ${HIDDEN.length} ticked`,
        message: `With "${KEY}" holding text that is not JSON, the board should still load, with nothing ticked.`,
        output: `${broken.errors.join('\n') || 'no errors'}\nroutes shown: ${names(broken).length}, #tick-count: "${count(broken)}"`
      }
    ]
  }
}

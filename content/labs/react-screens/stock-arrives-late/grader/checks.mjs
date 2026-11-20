import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const stock = JSON.parse(readFileSync(new URL('./stock.json', import.meta.url), 'utf8'))
const TITLES = stock.map((record) => record.title)

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

/**
 * A stand-in for the shop's server. `mode` can change between requests: 'ok', 'slow' (answers
 * when `release()` is called), 'error' (status 500) or 'offline' (the request itself fails).
 */
function server(mode = 'ok') {
  const s = { mode, calls: [] }
  let release
  s.release = () => release?.()
  s.fetch = async (input) => {
    s.calls.push(String(input?.url ?? input))
    if (s.mode === 'offline') throw new TypeError('Failed to fetch')
    if (s.mode === 'error') return new Response('Server error', { status: 500 })
    if (s.mode === 'slow') await new Promise((done) => (release = done))
    return new Response(JSON.stringify(stock), { headers: { 'content-type': 'application/json' } })
  }
  return s
}

const titles = (page) => page.$$('.record-card h3').map((h) => h.textContent.trim())
const statusLine = (page) =>
  page.$('.status-line')?.textContent.replace(/\s+/g, ' ').trim() ?? null
const tryAgain = (page) => page.$$('button').find((b) => b.textContent.trim() === 'Try again')

const screenOutput = (page) =>
  `status-line: ${statusLine(page) ?? '(none)'}\ncards: ${titles(page).join(', ') || '(none)'}`

/** Renders useStock() in a tiny component and prints what it returns into #probe. */
async function hookPage(t, fetch) {
  const dir = await t.sandbox()
  await mkdir(join(dir, '.grader'), { recursive: true })
  await writeFile(
    join(dir, '.grader/harness.html'),
    '<!doctype html><div id="root"></div><script type="module" src="harness.jsx"></script>'
  )
  await writeFile(
    join(dir, '.grader/harness.jsx'),
    `import { createRoot } from 'react-dom/client'
import * as mod from '../src/useStock.js'
const useStock = mod.useStock ?? mod.default
function Probe() {
  const result = useStock() ?? {}
  const records = Array.isArray(result.records) ? result.records : []
  return (
    <div>
      <output id="probe">{JSON.stringify({ status: result.status, titles: records.map((r) => r.title) })}</output>
      <button id="retry" onClick={() => result.retry?.()}>retry</button>
    </div>
  )
}
createRoot(document.getElementById('root')).render(<Probe />)
`
  )
  return t.page('.grader/harness.html', { dir, fetch })
}

const probe = (page) => {
  try {
    return JSON.parse(page.$('#probe')?.textContent ?? 'null') ?? {}
  } catch {
    return {}
  }
}

export const checks = {
  async 'load-stock'(t) {
    const s = server('ok')
    const page = await t.page('index.html', { fetch: s.fetch })
    const broken = pageError(page)
    if (broken) return [broken]
    await page.settle(100)

    return [
      detail(
        'Asks the server for data/stock.json',
        s.calls.length > 0 && s.calls.every((url) => /(^|\/)data\/stock\.json$/.test(url)),
        'The page should request data/stock.json with fetch when it opens.',
        `requests: ${s.calls.join(', ') || '(none)'}`
      ),
      detail(
        'Shows the stock the server sends',
        JSON.stringify(titles(page)) === JSON.stringify(TITLES),
        'The check answered with a stock your code has never seen. Put the parsed JSON into state so the list renders it.',
        `expected: ${TITLES.join(', ')}\n${screenOutput(page)}`
      ),
      detail(
        'Asks only once',
        s.calls.length >= 1 && s.calls.length <= 2,
        'The page kept asking for the stock. Fetch inside an effect, and give the effect a dependency array so it does not run after every render.',
        `requests: ${s.calls.length}`
      )
    ]
  },

  async 'loading-and-failure'(t) {
    const slow = server('slow')
    const page = await t.page('index.html', { fetch: slow.fetch })
    const broken = pageError(page)
    if (broken) return [broken]

    const whileLoading = statusLine(page)
    slow.release()
    await page.settle(50)
    const results = [
      detail(
        'Says the stock is loading while it waits',
        /loading/i.test(whileLoading ?? '') && titles(page).length === stock.length,
        'While the request is on its way, show an element with the class status-line that says the stock is loading. When the data arrives, show the list.',
        `while waiting: ${whileLoading ?? '(no status-line)'}\nafter: ${screenOutput(page)}`
      ),
      detail(
        'The status line goes away once the stock is in',
        statusLine(page) === null,
        'After the stock has loaded there should be no status-line left on the screen.',
        screenOutput(page)
      )
    ]

    for (const mode of ['error', 'offline']) {
      const s = server(mode)
      const failing = await t.page('index.html', { fetch: s.fetch })
      await failing.settle(50)
      const line = statusLine(failing)
      results.push(
        detail(
          mode === 'error' ? 'A server error shows the failure line' : 'A failed request shows the failure line',
          /could not be loaded/i.test(line ?? '') && Boolean(tryAgain(failing)) && failing.errors.length === 0,
          mode === 'error'
            ? 'The check answered with status 500. fetch does not throw for that, so check response.ok yourself, then show a status-line that says the stock could not be loaded, with a Try again button.'
            : 'The check made the request itself fail. Catch that and show a status-line that says the stock could not be loaded, with a Try again button.',
          failing.errors.join('\n') || screenOutput(failing)
        )
      )
      if (mode === 'error') {
        s.mode = 'ok'
        const button = tryAgain(failing)
        if (button) await failing.click(button)
        await failing.settle(50)
        results.push(
          detail(
            'Try again loads the stock',
            JSON.stringify(titles(failing)) === JSON.stringify(TITLES) && statusLine(failing) === null,
            'After Try again the page should ask the server again and, when it answers, show the list.',
            `requests: ${s.calls.length}\n${screenOutput(failing)}`
          )
        )
      }
    }
    return results
  },

  async 'use-stock-hook'(t) {
    const file = join(t.workspace, 'src/useStock.js')
    if (!existsSync(file)) {
      return [detail('src/useStock.js exists', false, 'There is no src/useStock.js. Create it.')]
    }

    const slow = server('slow')
    const page = await hookPage(t, slow.fetch)
    if (page.errors.length) {
      return [
        detail(
          'useStock can be called from a component',
          false,
          'Rendering a component that calls useStock() failed. Check that src/useStock.js exports useStock and read the error.',
          page.errors.join('\n')
        )
      ]
    }
    const first = probe(page)
    slow.release()
    await page.settle(50)
    const loaded = probe(page)
    const results = [
      detail(
        'useStock reports loading, then ready with the records',
        first.status === 'loading' &&
          loaded.status === 'ready' &&
          JSON.stringify(loaded.titles) === JSON.stringify(TITLES),
        "The check called useStock() from its own component. It should return { records, status, retry }, with status 'loading' while it waits and 'ready' once records holds the stock.",
        `while waiting: ${JSON.stringify(first)}\nafter: ${JSON.stringify(loaded)}`
      )
    ]

    const s = server('error')
    const failing = await hookPage(t, s.fetch)
    await failing.settle(50)
    const failed = probe(failing)
    s.mode = 'ok'
    await failing.click('#retry')
    await failing.settle(50)
    const retried = probe(failing)
    results.push(
      detail(
        "useStock reports failed, and retry loads again",
        failed.status === 'failed' &&
          retried.status === 'ready' &&
          JSON.stringify(retried.titles) === JSON.stringify(TITLES),
        "When the request fails, status should be 'failed'. Calling retry() should ask again and end in 'ready'.",
        `after the failure: ${JSON.stringify(failed)}\nafter retry: ${JSON.stringify(retried)}`
      )
    )

    const app = await readFile(join(t.workspace, 'src/App.jsx'), 'utf8')
    results.push(
      detail(
        'App gets the stock from useStock',
        /\buseStock\s*\(/.test(app) && !/\bfetch\s*\(/.test(app),
        'App.jsx should call useStock() and leave the fetching to the hook.',
        `App.jsx calls useStock: ${/\buseStock\s*\(/.test(app)}\nApp.jsx calls fetch: ${/\bfetch\s*\(/.test(app)}`
      )
    )
    return results
  }
}

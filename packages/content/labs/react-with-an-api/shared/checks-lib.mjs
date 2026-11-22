// What the checks of every issue share: a stand-in API the check controls, the page opened on it,
// and readers for what the screen shows.
import { fileURLToPath } from 'node:url'

const MAIN = fileURLToPath(new URL('./check-main.jsx', import.meta.url))
const STRICT_MAIN = fileURLToPath(new URL('./check-main-strict.jsx', import.meta.url))
const MOST_REQUESTS = 60

/** The checks' own week, so the stand-in's workshops can never be typed in as the answer. */
export const WEEK = [
  { id: 21, title: 'Raku evening', day: 'fri', seats: 8, priceCents: 6200, placesLeft: 4 },
  { id: 22, title: 'Slip casting', day: 'mon', seats: 6, priceCents: 4100, placesLeft: 2 },
  { id: 23, title: 'Throwing bowls', day: 'tue', seats: 6, priceCents: 4400, placesLeft: 1 },
  { id: 24, title: 'Coil-built planters', day: 'sun', seats: 10, priceCents: 3300, placesLeft: 0 }
]

export const copy = (list) => list.map((workshop) => ({ ...workshop }))

export const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})

function respond(status, body) {
  if (typeof body === 'string') {
    return new Response(body, { status, headers: { 'Content-Type': 'text/html' } })
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

function parse(body) {
  if (typeof body !== 'string') return body
  try {
    return JSON.parse(body)
  } catch {
    return body
  }
}

/**
 * The studio's API, played by the check. `route(request)` decides each answer: `[status, body]`,
 * `'network'` for a request that gets no answer, or `'hold'` to answer later with
 * `request.answer(status, body)` or `request.drop()`. A request whose signal is aborted rejects
 * the way fetch does.
 */
export function studio(route) {
  const requests = []

  function fetch(input, init = {}) {
    const url = new URL(String(input?.url ?? input), 'http://localhost/index.html')
    const headers = new Headers()
    for (const [key, value] of Object.entries(init.headers ?? {})) headers.set(key, value)
    if (typeof init.headers?.forEach === 'function') {
      init.headers.forEach((value, key) => headers.set(key, value))
    }
    const request = {
      method: String(init.method ?? input?.method ?? 'GET').toUpperCase(),
      path: url.pathname,
      url: url.pathname + url.search,
      day: url.searchParams.get('day'),
      contentType: headers.get('content-type') ?? '',
      body: parse(init.body),
      signal: init.signal,
      done: false,
      aborted: false
    }
    requests.push(request)

    return new Promise((resolve, reject) => {
      const finish = (settle) => {
        if (request.done) return
        request.done = true
        settle()
      }
      request.answer = (status, body) => finish(() => resolve(respond(status, body)))
      request.drop = () => finish(() => reject(new TypeError('Failed to fetch')))
      request.play = (plan) => (plan === 'network' ? request.drop() : request.answer(...plan))

      const signal = init.signal
      if (signal) {
        const cancel = () => {
          if (request.done) return
          request.aborted = true
          finish(() =>
            reject(signal.reason ?? new DOMException('The operation was aborted.', 'AbortError'))
          )
        }
        if (signal.aborted) cancel()
        else signal.addEventListener('abort', cancel, { once: true })
      }

      // A screen that asks on every render would ask forever; stop answering long before that.
      if (requests.length > MOST_REQUESTS) return
      const plan = route(request)
      if (plan !== 'hold') setTimeout(() => request.play(plan), 0)
    })
  }

  return {
    requests,
    fetch,
    lists: () => requests.filter((r) => r.method === 'GET' && r.path === '/api/workshops'),
    bookings: () => requests.filter((r) => r.method === 'POST' && r.path === '/api/bookings')
  }
}

/** The learner's App on the check's API. `strict` renders it inside StrictMode, as issue 5 does. */
export async function openApp(t, api, { strict = false } = {}) {
  const dir = await t.sandbox({ 'src/main.jsx': strict ? STRICT_MAIN : MAIN })
  return t.page('index.html', { dir, fetch: api.fetch })
}

const clean = (text) => (text ?? '').replace(/\s+/g, ' ').trim()

export const cards = (page) =>
  page.$$('.workshop').map((card) => ({
    title: clean(card.querySelector('h3')?.textContent),
    places: clean(card.querySelector('.places')?.textContent),
    text: clean(card.textContent)
  }))

export const titles = (page) => cards(page).map((card) => card.title)

export const placesOf = (page, title) => cards(page).find((card) => card.title === title)?.places

export const roleTexts = (page, role) =>
  page.$$(`[role="${role}"]`).map((element) => clean(element.textContent))

/** A status line outside the booking form that says something, in whatever words. */
export const loadingLine = (page) =>
  page
    .$$('[role="status"]')
    .some((element) => !element.closest('form.booking') && clean(element.textContent))

export function pageText(page) {
  const { document, window } = page
  const walker = document.createTreeWalker(document.body, window.NodeFilter.SHOW_TEXT)
  const words = []
  while (walker.nextNode()) words.push(walker.currentNode.textContent)
  return clean(words.join(' '))
}

export function buttonNamed(page, pattern) {
  return page.$$('button').find((button) => pattern.test(clean(button.textContent)))
}

export const bookButton = (page) => page.$('form.booking button[type="submit"]')

/**
 * Picks a workshop and types a name into the booking form. Returns a failed detail when the form
 * from the starter is not on the screen any more.
 */
export async function fillBooking(page, workshopId, name) {
  const missing = [
    '#booking-workshop',
    '#booking-name',
    'form.booking button[type="submit"]'
  ].filter((selector) => !page.$(selector))
  if (missing.length) {
    return detail(
      'The booking form is on the screen',
      false,
      'The booking form from the starter is not all there. The check looks for the workshop select, the name field and the submit button by the ids and class the starter gives them.',
      `missing: ${missing.join(', ')}\n${page.errors.join('\n')}`
    )
  }
  await page.type('#booking-workshop', String(workshopId))
  await page.type('#booking-name', name)
  return null
}

/** What the screen shows, for the output of a check. */
export function screen(page) {
  const list = cards(page)
  return [
    `cards: ${list.map((card) => `${card.title} (${card.places})`).join(', ') || '(none)'}`,
    `status: ${roleTexts(page, 'status').join(' | ') || '(none)'}`,
    `alert: ${roleTexts(page, 'alert').join(' | ') || '(none)'}`
  ].join('\n')
}

export const requestList = (requests) =>
  requests.map((r) => `${r.method} ${r.url}${r.aborted ? ' (cancelled)' : ''}`).join('\n') ||
  '(no requests)'

export function pageError(page) {
  if (!page.errors.length) return null
  return detail(
    'The page runs without errors',
    false,
    'The page stopped with an error before it could be checked. Open the console in the Browser panel and read the first error.',
    page.errors.join('\n')
  )
}

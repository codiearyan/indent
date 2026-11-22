import {
  WEEK,
  copy,
  detail,
  loadingLine,
  openApp,
  pageError,
  requestList,
  roleTexts,
  screen,
  studio,
  titles
} from '../../shared/checks-lib.mjs'

const TITLES = WEEK.map((workshop) => workshop.title)
const SERVER_SAYS = 'Bookings are paused while the studio moves its server.'
const PROXY_PAGE = '<html><body><h1>502 Bad Gateway</h1><p>upstream closed</p></body></html>'
const RAW =
  /failed to fetch|typeerror|unexpected token|syntaxerror|is not valid json|<html|undefined|null|\[object/i

const loading = loadingLine
const alerts = (page) => roleTexts(page, 'alert').filter(Boolean)
const listShown = (page) => JSON.stringify(titles(page)) === JSON.stringify(TITLES)

/** Opens the screen with the first request held, so the check decides when and how it ends. */
async function held(t, later = () => [200, copy(WEEK)]) {
  let first
  const api = studio((request) => {
    if (first) return later(request)
    first = request
    return 'hold'
  })
  const page = await openApp(t, api)
  await page.settle(50)
  return { api, page, first }
}

const noRequest = (api) =>
  detail(
    'The screen asks for the workshops',
    false,
    'No request for the workshops reached the API. The screen from the last issue asked for them when it opened; look at what changed around the request.',
    requestList(api.requests)
  )

/** Plays one failure on its own page and closes it, so its errors never reach another page. */
async function failing(t, plan, says, missing) {
  const { api, page, first } = await held(t)
  if (!first) {
    page.close()
    return { problem: noRequest(api).message, output: requestList(api.requests), noRequest: true }
  }
  first.play(plan)
  await page.settle(50)
  const output = page.errors.join('\n') || screen(page)
  const stillWaiting =
    'The request failed, but the screen still says it is loading. Follow the failure to the code that catches it: that code has to change what the screen shows.'
  const problem = judge(page, says) ?? (loading(page) ? stillWaiting : missing)
  page.close()
  return { problem, output }
}

function judge(page, says) {
  const shown = alerts(page)
  if (page.errors.some((error) => error.startsWith('Uncaught (in promise)'))) {
    return `The failure was never caught, so the page stopped instead of showing an alert. A rejected promise goes nowhere unless something catches it.`
  }
  if (page.errors.length) {
    return `The page stopped with an error instead of showing an alert: ${page.errors[0]}`
  }
  if (!shown.length) return null
  if (loading(page)) {
    return 'The alert is there, but the loading line stayed too. Only one of them can be true at a time.'
  }
  if (titles(page).length) return 'The alert is there, but a list of workshops is shown too.'
  return says(shown.join(' '))
}

export const checks = {
  async 'show-loading'(t) {
    const { api, page, first } = await held(t)
    if (!first) return [page.errors.length ? pageError(page) : noRequest(api)]
    const whileWaiting = screen(page)
    const saidLoading = loading(page)
    const listEarly = titles(page).length > 0
    first.answer(200, copy(WEEK))
    await page.settle(50)
    const broken = pageError(page)
    if (broken) return [broken]

    return [
      detail(
        'Says the workshops are loading while it waits',
        saidLoading && !listEarly,
        listEarly
          ? 'While the answer was on its way, the screen already showed workshops. No list is shown until the answer arrives.'
          : 'While the answer was on its way, the screen showed no line with role="status" that says the workshops are loading.',
        `while waiting:\n${whileWaiting}`
      ),
      detail(
        'Shows the workshops, and no loading line, once they arrive',
        listShown(page) && !loading(page),
        loading(page)
          ? 'The workshops arrived, but the loading line stayed on the screen. It is only true while the request is on its way.'
          : alerts(page).length
            ? 'The request worked, but the screen shows an alert instead of the list. Read what the alert says: something goes wrong after the answer arrives.'
            : 'The answer arrived, but the screen does not show its workshops.',
        `after the answer:\n${screen(page)}`
      )
    ]
  },

  async 'show-failure'(t) {
    const server = await failing(
      t,
      [503, { error: { code: 'unavailable', message: SERVER_SAYS } }],
      (text) =>
        text.includes(SERVER_SAYS)
          ? ''
          : 'The screen showed an alert, but not the message the server put in the body of its answer. The server explains what went wrong: show its words.',
      'The API answered with status 503 and a message, and the screen showed no alert. fetch does not treat an error status as a failure by itself: look at response.ok.'
    )
    if (server.noRequest)
      return [detail('The screen asks for the workshops', false, server.problem, server.output)]
    const network = await failing(
      t,
      'network',
      (text) =>
        RAW.test(text)
          ? "The alert shows the browser's own words for the failure. A visitor cannot act on those: write a sentence that says the studio could not be reached."
          : '',
      'The request got no answer at all, and the screen showed no alert. When the server cannot be reached, fetch rejects: catch that and say so in plain words.'
    )
    const proxy = await failing(
      t,
      [502, PROXY_PAGE],
      (text) =>
        RAW.test(text)
          ? "The answer was an error page in HTML, not the API's JSON, and the alert shows what went wrong while reading it. When the body is not the JSON you expect, fall back to a sentence of your own."
          : '',
      'The answer had status 502 and a web page as its body, and the screen showed no alert. An error answer is not always JSON; it is still a failure.'
    )

    return [
      detail(
        "A server error shows the server's message",
        !server.problem,
        server.problem,
        server.output
      ),
      detail(
        'A request with no answer says the studio could not be reached',
        !network.problem,
        network.problem,
        network.output
      ),
      detail(
        'An error answer that is not JSON still gets a plain sentence',
        !proxy.problem,
        proxy.problem,
        proxy.output
      )
    ]
  },

  async 'try-again'(t) {
    let second
    const { api, page, first } = await held(t, (request) => {
      second = request
      return 'hold'
    })
    if (!first) return [page.errors.length ? pageError(page) : noRequest(api)]
    first.answer(503, { error: { code: 'unavailable', message: SERVER_SAYS } })
    await page.settle(50)

    if (!alerts(page).length) {
      return [
        detail(
          'The failure shows an alert to try again from',
          false,
          'After a failed request the screen showed no alert, so there was no Try again to press. Task 2 is not right yet.',
          screen(page)
        )
      ]
    }
    const button = page
      .$$('[role="alert"] button')
      .find((element) => /try again/i.test(element.textContent))
    if (!button) {
      return [
        detail(
          'The alert has a Try again button',
          false,
          'The alert shows the failure, but it has no button that says Try again.',
          screen(page)
        )
      ]
    }

    await page.click(button)
    const asking = screen(page)
    const reloaded = page.reloads > 0
    const askedAgain = Boolean(second)
    const swapped = askedAgain && loading(page) && !alerts(page).length
    second?.answer(200, copy(WEEK))
    await page.settle(50)

    return [
      detail(
        'Try again asks the API again',
        askedAgain && api.lists().length === 2,
        reloaded
          ? 'Try again reloaded the whole page instead of asking for the workshops again. Everything else on the screen would be lost too.'
          : askedAgain
            ? `Pressing Try again once sent ${api.lists().length - 1} new requests. It should send one.`
            : 'Pressing Try again sent no new request to the API.',
        requestList(api.requests)
      ),
      detail(
        'While it asks again, the loading line replaces the alert',
        swapped,
        askedAgain
          ? 'After Try again was pressed, the screen did not go back to the loading line: the old alert stayed, or nothing said it was loading.'
          : 'There was no new request to wait for.',
        `while asking again:\n${asking}`
      ),
      detail(
        'When the answer comes, the workshops replace the alert',
        listShown(page) && !alerts(page).length && !loading(page),
        askedAgain
          ? 'The second request worked, but the screen does not show its workshops on their own: the alert or the loading line is still there, or the list is missing.'
          : 'There was no second request, so the workshops never came.',
        `after the answer:\n${screen(page)}`
      )
    ]
  }
}

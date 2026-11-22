import {
  WARNING,
  clean,
  detail,
  explain,
  exportType,
  openComponent,
  runaway,
  shorten,
  warningsOf
} from '../../grading.mjs'

// The check's own days and rides, so the museum's timetable cannot be typed in as the answer.
const ride = (day, time, tram) => ({ id: `${day}-${time}`, time, tram })
const RIDES = {
  tue: [ride('tue', '09:45', 'The Pithead Runner'), ride('tue', '12:15', 'The Hartsop Car')],
  wed: [ride('wed', '10:05', 'The Ironbridge Belle'), ride('wed', '11:35', 'The Pithead Runner'), ride('wed', '16:20', 'The Last Car Home')],
  thu: [ride('thu', '13:50', 'The Hartsop Car')],
  bank: [ride('bank', '10:10', 'The Last Car Home'), ride('bank', '14:40', 'The Ironbridge Belle')]
}
const MOST_REQUESTS = 30
const RAW = /failed to fetch|typeerror|syntaxerror|unexpected token|is not valid json|\[object|undefined|null/i

/**
 * The museum's timetable files, played by the check. Every request waits until the check answers
 * it: `request.answer(status, body)`, `request.rides()` for the check's rides of that day, or
 * `request.drop()` for a request that gets no answer. A request whose signal is aborted rejects
 * the way fetch does. After MOST_REQUESTS it stops answering, so a screen that asks on every draw
 * cannot ask for ever.
 */
function timetable() {
  const requests = []
  const api = { requests, page: null }
  function fetch(input, init = {}) {
    const url = new URL(String(input?.url ?? input), 'http://localhost/index.html')
    const request = {
      path: url.pathname,
      day: url.pathname.match(/^\/timetable\/([^/]+)\.json$/)?.[1],
      // While React is still drawing a component for the first time, nothing of it is on the page yet.
      onScreen: api.page?.document.getElementById('root').children.length > 0,
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
      request.answer = (status, body) =>
        finish(() =>
          resolve(
            typeof body === 'string'
              ? new Response(body, { status, headers: { 'Content-Type': 'text/plain' } })
              : new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
          )
        )
      request.rides = () => request.answer(200, (RIDES[request.day] ?? []).map((r) => ({ ...r })))
      request.drop = () => finish(() => reject(new TypeError('Failed to fetch')))
      const signal = init.signal
      if (signal) {
        const cancel = () => {
          request.aborted = true
          finish(() => reject(signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')))
        }
        if (signal.aborted) cancel()
        else signal.addEventListener('abort', cancel, { once: true })
      }
      if (requests.length > MOST_REQUESTS) request.done = true
    })
  }
  return Object.assign(api, { fetch, last: (day) => requests.findLast((r) => r.day === day) })
}

async function timetablePage(t) {
  const api = timetable()
  const { page, problem } = await openComponent(t, 'src/Timetable.jsx', {}, { fetch: api.fetch })
  if (problem) return { problem }
  if (exportType(page, 'Timetable') !== 'function') {
    return {
      problem: detail('Timetable.jsx exports Timetable', false, 'Timetable.jsx has no export called Timetable any more. Keep the name and the export.')
    }
  }
  api.page = page
  return { page, api }
}

const stopped = (error) => detail('The timetable runs without errors', false, explain(error), error)
const thrown = (page, before) => (page.errors.length > before ? page.errors[before] : null)
const rideTexts = (page) => page.$$('#root .rides li').map((li) => clean(li.textContent))
const showsRides = (page, day) => {
  const shown = rideTexts(page)
  return shown.length === RIDES[day].length && RIDES[day].every((r, i) => shown[i].includes(r.time) && shown[i].includes(r.tram))
}
const loadingText = (page) => clean(page.$('#root .loading')?.textContent)
const problemText = (page) => clean(page.$('#root .problem')?.textContent)
const screen = (page) =>
  [
    `loading: ${loadingText(page) || '(none)'}`,
    `problem: ${problemText(page) || '(none)'}`,
    `rides: ${rideTexts(page).join(' | ') || '(none)'}`
  ].join('\n')
const asked = (api) => api.requests.map((r) => `${r.path}${r.aborted ? ' (cancelled)' : ''}`).join('\n') || '(no requests)'

let fresh = 0

/**
 * Draws a new timetable for a day, or changes the day of the one on the screen. It is drawn inside
 * the Profiler, so runaway() can see drawing that goes on and on.
 */
async function showDay(page, day, isNew) {
  if (isNew || !page.shownKey) page.shownKey = `fresh-${++fresh}`
  const before = page.errors.length
  try {
    page.window.showCounted('Timetable', { day, key: page.shownKey })
  } catch (error) {
    page.errors.push(error?.message ?? String(error))
  }
  if (page.errors.length === before) await page.settle()
  return page.errors[before] ?? null
}

/** Task 1: the details, or the first thing that went wrong. */
async function loads(page, api) {
  const logsBefore = page.logs.length
  const before = page.errors.length
  page.window.clear()
  const error = await showDay(page, 'wed', true)
  if (error) return [stopped(error)]
  const loop = await runaway(page, logsBefore, 'The timetable')
  if (loop) return [loop]
  const asyncWarning = warningsOf(page.logs.slice(logsBefore), WARNING.asyncEffect)
  if (asyncWarning.length) {
    return [
      detail(
        'The effect returns nothing but a cleanup function',
        false,
        'React says in the console that the effect must not return anything besides a function. An async function always returns a promise, so the effect itself cannot be async: write an async function inside the effect and call it.',
        shorten(asyncWarning[0])
      )
    ]
  }
  if (api.requests[0]?.onScreen === false) {
    return [
      detail(
        'The rides are asked for from an effect',
        false,
        'fetch was called while Timetable was being drawn. A request is something outside React: send it from an effect, after the screen is drawn.',
        asked(api)
      )
    ]
  }
  if (!api.requests.length) {
    return [detail('Timetable asks for the day\'s rides', false, 'No request went out when Timetable appeared. An effect calls fetch with the address of the day\'s file.', asked(api))]
  }
  if (api.requests[0].day !== 'wed') {
    return [
      detail(
        "Timetable asks for the day's rides",
        false,
        `A request went out to ${api.requests[0].path}. The rides of a day are in timetable/ followed by the day prop and .json; the check drew Timetable with a day of its own.`,
        asked(api)
      )
    ]
  }
  const steps = []
  for (const day of ['wed', 'tue']) {
    if (day !== 'wed') {
      const changed = await showDay(page, day)
      if (changed) return [stopped(changed)]
    }
    const request = api.last(day)
    if (!request) {
      return [
        detail(
          'A new day asks again',
          false,
          'The day changed, and no request went out for the new day. The effect ran only when Timetable first appeared: its dependency list names every value from the component that the effect uses.',
          asked(api)
        )
      ]
    }
    request.rides()
    await page.settle()
    if (thrown(page, before)) return [stopped(thrown(page, before))]
    const again = await runaway(page, logsBefore, 'The timetable')
    if (again) return [again]
    steps.push({ day, shown: showsRides(page, day), loading: loadingText(page), screen: screen(page), requests: api.requests.filter((r) => r.day === day).length })
  }
  const total = api.requests.length
  if (total !== 2) {
    return [
      detail(
        'Each day is asked for once',
        false,
        `The timetable was asked ${total >= MOST_REQUESTS ? 'again and again, until the check stopped answering' : `${total} times`} for 2 days. Each answer draws Timetable again, and the effect ran again after that draw. Its dependency list names only what the effect uses.`,
        asked(api)
      )
    ]
  }
  const shows = steps.every((s) => s.shown)
  const results = [detail('Each day is asked for once', true)]
  results.push(
    detail(
      "Each day's rides show once they arrive",
      shows,
      steps.some((s) => !s.shown && s.loading)
        ? 'The rides arrived, and the screen still said it was loading and showed no rides. Switch loading off once the answer is in.'
        : "The timetable answered with the day's rides, and the screen did not show them all, in the order they came. Read the answer's body as JSON, keep the rides in state, and draw one list item per ride with its time and its tram.",
      steps.map((s) => `day ${s.day} answered\n${s.screen}`).join('\n')
    )
  )
  return results
}

/** One detail when task 1 is not right yet. */
async function loadProblem(page, api) {
  const failed = (await loads(page, api)).find((r) => !r.passed)
  if (!failed) return null
  if (/stops drawing|returns nothing but/.test(failed.name)) return failed
  return detail(
    "Timetable loads the day's rides",
    false,
    "Timetable does not load the day's rides yet. That is the first task of this issue: do it first."
  )
}

export const checks = {
  async load(t) {
    const { page, api, problem } = await timetablePage(t)
    if (problem) return [problem]
    return loads(page, api)
  },

  async loading(t) {
    const { page, api, problem } = await timetablePage(t)
    if (problem) return [problem]
    const first = await loadProblem(page, api)
    if (first) return [first]
    const before = page.errors.length
    const log = []
    const note = (what) => log.push({ what, loading: loadingText(page), rides: rideTexts(page).length })
    page.window.clear()
    await showDay(page, 'thu', true)
    note('day thu asked, no answer yet')
    api.last('thu').rides()
    await page.settle()
    note('thu answered')
    await showDay(page, 'wed')
    note('day changed to wed, no answer yet')
    api.last('wed').rides()
    await page.settle()
    note('wed answered')
    if (thrown(page, before)) return [stopped(thrown(page, before))]
    const output = log.map((l) => `${l.what}: loading ${l.loading ? `"${l.loading}"` : '(none)'}, ${l.rides} rides shown`).join('\n')
    const [wait1, done1, wait2, done2] = log
    let message = 'While a day is on its way, a paragraph with the class loading says so and no rides are shown; once it arrives, the loading line goes and the rides show.'
    if (!wait1.loading && !wait2.loading) message = 'Nothing said the rides were loading while the answer was on its way. Keep in state whether a request is out, and show a paragraph with the class loading while it is.'
    else if (done1.loading || done2.loading) message = 'The rides arrived, and the loading line stayed on the screen. Switch it off once the answer is in.'
    else if (!wait2.loading) message = 'The loading line showed for the first day, but not when the day changed. Switch it on each time a request goes out.'
    else if (wait2.rides) message = "While the new day was loading, the old day's rides were still on the screen, as if they were the new day's. Show no rides while a day is loading."
    const passed = Boolean(wait1.loading && wait2.loading && !done1.loading && !done2.loading && !wait1.rides && !wait2.rides && done2.rides)
    return [detail('The screen says when the rides are loading', passed, message, output)]
  },

  async failed(t) {
    const { page, api, problem } = await timetablePage(t)
    if (problem) return [problem]
    const first = await loadProblem(page, api)
    if (first) return [first]
    const results = []
    const cases = [
      { day: 'mon', name: 'A 404 answer shows a problem', what: 'answered 404 Not found, as a missing file does', play: (r) => r.answer(404, 'Not found') },
      { day: 'fri', name: 'A 503 answer shows a problem', what: 'answered 503 with a message in JSON', play: (r) => r.answer(503, { message: 'The timetable is being updated' }) },
      { day: 'sun', name: 'No answer at all shows a problem', what: 'got no answer at all', play: (r) => r.drop() }
    ]
    for (const c of cases) {
      const before = page.errors.length
      page.window.clear()
      await showDay(page, c.day, true)
      c.play(api.last(c.day))
      await page.settle()
      const error = thrown(page, before)
      const said = problemText(page)
      const output = `the request for ${c.day} ${c.what}\n${screen(page)}${error ? `\npage error: ${error}` : ''}`
      let message = 'When the rides cannot be loaded, a paragraph with the class problem says so in plain words, the loading line goes, and no rides are shown.'
      if (error && /is not a function|is not iterable/.test(error))
        message = "An answer with an error status was read as if it held rides, and drawing them stopped the page. fetch does not fail on an error status by itself: look at the answer's ok before reading its body."
      else if (error) message = `The page stopped with an error that was not caught: ${explain(error)}`
      else if (!said && loadingText(page)) message = 'The request failed, and the screen kept saying it was loading. Catch the failure, switch loading off, and say what happened.'
      else if (!said) message = 'The request failed, and the screen said nothing about it. Catch the failure and show it in a paragraph with the class problem.'
      else if (RAW.test(said)) message = "The problem shown is the error's own message, in the browser's words. Say what happened in plain words for a visitor."
      else if (loadingText(page)) message = 'The problem is shown, but the loading line is still there. Switch it off when the request fails too.'
      else if (rideTexts(page).length) message = 'The problem is shown, but rides are shown too. Show no rides when they could not be loaded.'
      const passed = !error && Boolean(said) && !RAW.test(said) && !loadingText(page) && !rideTexts(page).length
      results.push(detail(c.name, passed, message, output))
      if (!passed) return results
    }
    await showDay(page, 'bank')
    api.last('bank').rides()
    await page.settle()
    const passed = !problemText(page) && showsRides(page, 'bank')
    results.push(
      detail(
        'The next day that loads clears the problem',
        passed,
        problemText(page)
          ? 'After a failed day, another day loaded fine, and the old problem stayed on the screen. Clear the problem when a new request goes out.'
          : 'After a failed day, another day loaded, and its rides did not show.',
        `then the day changed to bank, which answered with its rides\n${screen(page)}`
      )
    )
    return results
  },

  async latest(t) {
    const { page, api, problem } = await timetablePage(t)
    if (problem) return [problem]
    const first = await loadProblem(page, api)
    if (first) return [first]
    const before = page.errors.length
    const results = []
    const log = []

    page.window.clear()
    await showDay(page, 'tue', true)
    const tue = api.last('tue')
    await showDay(page, 'wed')
    const wed = api.last('wed')
    if (!wed) return [stopped('No request went out for the second day.')]
    wed.rides()
    await page.settle()
    log.push(`wed answered first:\n${screen(page)}`)
    tue.rides()
    await page.settle()
    log.push(`then tue's older answer arrived:\n${screen(page)}`)
    const kept = showsRides(page, 'wed') && !loadingText(page)

    await showDay(page, 'thu')
    const thu = api.last('thu')
    await showDay(page, 'bank')
    const bank = api.last('bank')
    thu.rides()
    await page.settle()
    log.push(`thu, then bank asked; thu's older answer arrived first:\n${screen(page)}`)
    const waited = !rideTexts(page).some((text) => RIDES.thu.some((r) => text.includes(r.tram) && text.includes(r.time)))
    bank.rides()
    await page.settle()
    log.push(`then bank answered:\n${screen(page)}`)
    const landed = showsRides(page, 'bank') && !loadingText(page)
    if (thrown(page, before)) return [stopped(thrown(page, before))]
    const cancelled = api.requests.some((r) => r.aborted)
    let message = 'Whatever order the answers arrive in, the screen shows the day picked last.'
    if ((!kept || !waited || !landed) && cancelled && problemText(page))
      message = 'A request that was cancelled on purpose showed up on the screen as a problem. Cancelling makes fetch fail too: a cancelled request is not a problem to show.'
    else if (!kept || !waited)
      message = `An answer for a day that was no longer chosen arrived late and ${!kept ? 'took the place of' : 'showed before'} the rides of the day picked last. When the day changes, the effect's cleanup runs: use it to make the old request's answer be ignored, or cancel the request.`
    else if (!landed) message = "The day picked last answered, and its rides did not show, or the loading line stayed. An ignored older answer must not keep the newer one from showing."
    results.push(detail('The day picked last wins', kept && waited && landed, message, log.join('\n')))
    if (!results[0].passed) return results

    const holiday = api.requests.length
    await showDay(page, 'mon')
    const mon = api.last('mon')
    await showDay(page, 'tue')
    const tueAgain = api.last('tue')
    if (api.requests.length < holiday + 2) return [...results, stopped('No request went out for a day.')]
    tueAgain.rides()
    await page.settle()
    mon.answer(404, 'Not found')
    await page.settle()
    if (thrown(page, before)) return [...results, stopped(thrown(page, before))]
    const passed = showsRides(page, 'tue') && !problemText(page) && !loadingText(page)
    results.push(
      detail(
        'An old request that fails late changes nothing',
        passed,
        cancelled && problemText(page)
          ? 'A request that was cancelled on purpose showed up on the screen as a problem. Cancelling makes fetch fail too: a cancelled request is not a problem to show.'
          : 'A request for a day that was no longer chosen failed late, and it changed the screen. An old request\'s failure is ignored just like its answer.',
        `mon, then tue asked; tue answered, then mon failed late\n${screen(page)}`
      )
    )
    return results
  }
}

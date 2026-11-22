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

const TUESDAY = [
  { id: 41, title: 'Lidded jars', day: 'tue', seats: 6, priceCents: 4600, placesLeft: 3 },
  { id: 42, title: 'Sgraffito plates', day: 'tue', seats: 8, priceCents: 3800, placesLeft: 5 }
]
const THURSDAY = [
  { id: 51, title: 'Evening glaze lab', day: 'thu', seats: 6, priceCents: 3600, placesLeft: 2 },
  {
    id: 52,
    title: 'Teapots, start to finish',
    day: 'thu',
    seats: 5,
    priceCents: 7400,
    placesLeft: 1
  }
]
const names = (list) => list.map((workshop) => workshop.title)
const same = (page, list) => JSON.stringify(titles(page)) === JSON.stringify(names(list))
const loading = loadingLine
const LABELS = { all: 'All', tue: 'Tue', thu: 'Thu' }

/**
 * The screen inside StrictMode, as the starter renders it, with the whole week answered. Every
 * later request is held so the check decides when each one arrives.
 */
async function week(t) {
  const held = []
  const api = studio((request) => {
    if (request.path === '/api/workshops' && request.day === null && !held.length) {
      return [200, copy(WEEK)]
    }
    held.push(request)
    return 'hold'
  })
  const page = await openApp(t, api, { strict: true })
  await page.settle(50)
  const broken = pageError(page)
  if (broken) return { failed: broken }
  if (!api.lists().length) {
    return {
      failed: detail(
        'The screen asks for the workshops',
        false,
        'No request for the workshops reached the API when the screen opened. It did at the end of the last issue; look at what changed around the effect.',
        requestList(api.requests)
      )
    }
  }
  const buttons = page.$$('.days button')
  if (buttons.length < 8) {
    return {
      failed: detail(
        'The day picker is on the screen',
        false,
        'The day buttons from the starter are not on the screen.',
        screen(page)
      )
    }
  }
  const choose = async (day) => {
    const button = buttons.find((element) => element.textContent.trim() === LABELS[day])
    button.click()
    await page.settle(20)
  }
  const forDay = (day) => held.filter((request) => request.day === day)
  return { api, page, held, choose, forDay }
}

export const checks = {
  async 'ask-for-the-day'(t) {
    const { api, page, held, choose, forDay, failed } = await week(t)
    if (failed) return [failed]
    const before = api.requests.length
    await choose('thu')
    const sent = api.requests.slice(before)
    const [thursday] = forDay('thu')
    const whileWaiting = screen(page)
    const oldGone = loading(page) && titles(page).every((title) => !names(WEEK).includes(title))
    thursday?.answer(200, copy(THURSDAY))
    await page.settle(50)
    const afterThursday = screen(page)
    const showsThursday = same(page, THURSDAY)

    await choose('all')
    const all = held.filter((request) => request.day === null && request.path === '/api/workshops')
    for (const request of all) request.answer(200, copy(WEEK))
    await page.settle(50)
    const backToAll = same(page, WEEK)

    let asked = ''
    if (!sent.length) {
      asked =
        'Choosing Thursday sent no request. The list depends on the chosen day now, and nothing makes the request run again when the day changes.'
    } else if (!thursday) {
      asked = sent.some((request) => request.path === '/api/workshops' && request.day === null)
        ? 'Choosing Thursday asked for the whole week again: the request does not say which day it wants.'
        : 'Choosing Thursday sent a request, but not for the day the API knows as thu. The API reads the day from ?day= in the address.'
    }

    return [
      detail('Choosing a day asks the API for that day', !asked, asked, requestList(sent)),
      detail(
        "While the day's list travels, the loading line shows instead of the old cards",
        !asked && oldGone,
        asked
          ? 'There was no request for the day to wait for.'
          : "While Thursday's list was on its way, the screen did not show the loading line, or it still showed the cards of the whole week. Those cards are not Thursday's.",
        `while waiting:\n${whileWaiting}`
      ),
      detail(
        "The day's answer is shown, and All goes back to the whole week",
        showsThursday && backToAll,
        !thursday
          ? 'Without a request for Thursday there was no answer to show.'
          : !showsThursday
            ? "Thursday's answer arrived, but the cards do not show it."
            : 'Choosing All again did not bring back the whole week. All asks for the list without a day.',
        `after Thursday's answer:\n${afterThursday}\nafter choosing All:\n${screen(page)}`
      )
    ]
  },

  async 'newest-wins'(t) {
    const results = []
    for (const order of [
      ['thu', 'tue'],
      ['tue', 'thu']
    ]) {
      const opened = await week(t)
      if (opened.failed) return [opened.failed]
      const { page, choose, forDay, api } = opened
      await choose('tue')
      await choose('thu')
      const [tuesday] = forDay('tue')
      const [thursday] = forDay('thu')
      if (!tuesday || !thursday) {
        page.close()
        return [
          detail(
            'Each day chosen asks the API for its list',
            false,
            'Choosing Tuesday and then Thursday did not ask for both days. Task 1 is not right yet.',
            requestList(api.requests)
          )
        ]
      }
      const lists = { tue: [tuesday, TUESDAY], thu: [thursday, THURSDAY] }
      const [firstDay, lateDay] = order
      lists[firstDay][0].answer(200, copy(lists[firstDay][1]))
      await page.settle(50)
      const between = screen(page)
      const betweenWrong = same(page, TUESDAY)
      lists[lateDay][0].answer(200, copy(lists[lateDay][1]))
      await page.settle(50)
      results.push({ order, between, betweenWrong, end: screen(page), right: same(page, THURSDAY) })
      page.close()
    }
    const [lateTuesday, earlyTuesday] = results

    return [
      detail(
        "Tuesday's late answer does not replace Thursday's list",
        lateTuesday.right,
        'Tuesday was chosen, then Thursday. Thursday answered first, Tuesday came late, and the late answer took over the screen. Only the answer for the day chosen last may be shown.',
        `after Thursday's answer:\n${lateTuesday.between}\nafter Tuesday's late answer:\n${lateTuesday.end}`
      ),
      detail(
        "Tuesday's answer is not shown while Thursday's is on its way",
        !earlyTuesday.betweenWrong && earlyTuesday.right,
        earlyTuesday.betweenWrong
          ? "Tuesday was chosen, then Thursday. Tuesday's answer arrived while Thursday's was still on its way, and the screen showed Tuesday's workshops under Thursday."
          : "Both answers arrived, but the screen does not end on Thursday's list.",
        `after Tuesday's answer:\n${earlyTuesday.between}\nafter Thursday's answer:\n${earlyTuesday.end}`
      )
    ]
  },

  async 'cancel-unwanted'(t) {
    const opened = await week(t)
    if (opened.failed) return [opened.failed]
    const { page, choose, forDay, api } = opened
    await choose('tue')
    await choose('thu')
    const [tuesday] = forDay('tue')
    const [thursday] = forDay('thu')
    if (!tuesday || !thursday) {
      return [
        detail(
          'Each day chosen asks the API for its list',
          false,
          'Choosing Tuesday and then Thursday did not ask for both days. Task 1 is not right yet.',
          requestList(api.requests)
        )
      ]
    }
    await page.settle(30)
    const cancelled = tuesday.aborted
    const alertsAfterCancel = roleTexts(page, 'alert').filter(Boolean)
    thursday.answer(200, copy(THURSDAY))
    await page.settle(50)
    const alertsAtEnd = roleTexts(page, 'alert').filter(Boolean)
    const endScreen = screen(page)
    page.close()

    const closing = await week(t)
    if (closing.failed) return [closing.failed]
    await closing.choose('thu')
    const [open] = closing.forDay('thu')
    closing.page.window.closeScreen()
    await closing.page.settle(30)
    const closedCancelled = Boolean(open?.aborted)
    const closingRequests = requestList(closing.api.requests)
    closing.page.close()

    return [
      detail(
        'Choosing another day cancels the request still on its way',
        cancelled,
        "When Thursday was chosen, Tuesday's request was still on its way and nobody wanted its answer any more, but it was not cancelled. fetch can be handed a signal that cancels it.",
        requestList(api.requests)
      ),
      detail(
        'A cancelled request is never shown as a failure',
        !alertsAfterCancel.length && !alertsAtEnd.length,
        [...alertsAfterCancel, ...alertsAtEnd].some((text) => /abort/i.test(text))
          ? "A request that was cancelled on purpose showed up on the screen as a failure, in the browser's words for a cancel. Cancelling makes fetch reject too: the code that shows the alert has to tell a cancel apart from a real failure."
          : 'A request that was cancelled on purpose showed up on the screen as a failure. Cancelling makes fetch reject too, and on its way to the alert the cancel turned into another error: look at what request() in src/api.js does with it.',
        `alert after the cancel: ${alertsAfterCancel.join(' | ') || '(none)'}\nat the end:\n${endScreen}`
      ),
      detail(
        'Closing the screen cancels its request',
        closedCancelled,
        open
          ? 'The screen was closed while its request was on its way, and the request was not cancelled.'
          : 'There was no request on its way when the screen closed.',
        `${closingRequests}\n(the screen closed while the last one was on its way)`
      )
    ]
  }
}

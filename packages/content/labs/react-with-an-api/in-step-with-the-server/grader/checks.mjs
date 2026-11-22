import {
  WEEK,
  bookButton,
  copy,
  detail,
  fillBooking,
  openApp,
  pageError,
  placesOf,
  requestList,
  roleTexts,
  screen,
  studio,
  titles
} from '../../shared/checks-lib.mjs'

const [RAKU, , BOWLS] = WEEK
const TITLES = WEEK.map((workshop) => workshop.title)
const NAME = 'Wren Hollis'
const BOWLS_GONE = 'Throwing bowls filled up a minute ago.'

// While the form was open, someone at the front desk booked a Raku place too.
const rakuAfter = { ...RAKU, placesLeft: RAKU.placesLeft - 2 }
const weekAfterRaku = () => WEEK.map((w) => (w.id === RAKU.id ? { ...rakuAfter } : { ...w }))
const weekAfterBowls = () =>
  WEEK.map((w) => (w.id === BOWLS.id ? { ...w, placesLeft: 0 } : { ...w }))

/**
 * The screen with the week loaded and `workshop` picked in the form. `answers` decides the
 * booking, `later` every list asked for after the first one.
 */
async function booking(t, workshop, { answers, later }) {
  let lists = 0
  const api = studio((request) => {
    if (request.path === '/api/bookings') return answers(request)
    lists += 1
    return lists === 1 ? [200, copy(WEEK)] : later(request)
  })
  const page = await openApp(t, api)
  await page.settle(50)
  const broken = pageError(page)
  if (broken) return { failed: broken }
  const missing = await fillBooking(page, workshop.id, NAME)
  if (missing) return { failed: missing }
  const before = placesOf(page, workshop.title)
  await page.click(bookButton(page))
  await page.settle(50)
  if (page.errors.length) {
    return {
      failed: detail(
        'The page runs without errors after the answer',
        false,
        'The page stopped with an error after the booking was answered. Open the console in the Browser panel and read the first error.',
        page.errors.join('\n')
      )
    }
  }
  if (!api.bookings().length) {
    return {
      failed: detail(
        'The booking form sends the booking',
        false,
        'Pressing Book a place sent no booking, so there was nothing to keep in step with. The form worked at the end of the last issue; look at what changed in BookingForm.jsx.',
        requestList(api.requests)
      )
    }
  }
  return { api, page, before }
}

const placesText = (left) =>
  left === 0 ? 'Full' : left === 1 ? '1 place left' : `${left} places left`

export const checks = {
  async 'places-from-server'(t) {
    const { api, page, before, failed } = await booking(t, RAKU, {
      answers: () => [
        201,
        { booking: { id: 601, workshopId: RAKU.id, name: NAME }, workshop: { ...rakuAfter } }
      ],
      later: () => [200, weekAfterRaku()]
    })
    if (failed) return [failed]
    const after = placesOf(page, RAKU.title)
    const othersKept = WEEK.filter((w) => w.id !== RAKU.id).every(
      (w) => placesOf(page, w.title) === placesText(w.placesLeft)
    )

    let problem = ''
    if (page.reloads) {
      problem =
        'The page reloaded after the booking. The places left have to change without a reload.'
    } else if (after === undefined) {
      problem = 'After the booking, the card of the booked workshop was gone from the list.'
    } else if (JSON.stringify(titles(page)) !== JSON.stringify(TITLES)) {
      problem =
        'After the booking the list does not hold the same workshops in the same order any more.'
    } else if (after === before) {
      problem =
        'After the booking the card still shows the places left from before. Look at how the new number reaches state: React only draws again when it is handed a new list, so a list changed in place shows nothing new, and neither does a handleBooked that never sets state.'
    } else if (after !== placesText(rakuAfter.placesLeft)) {
      problem =
        'The card shows a number the screen worked out itself. The server counted differently: another place went at the front desk while the form was open. Show the number the server sends.'
    } else if (!othersKept) {
      problem = 'The booked card is right, but the places left of another workshop changed with it.'
    }

    return [
      detail(
        'After a booking, the card shows the places left the server reports',
        !problem,
        problem,
        `before the booking: ${before}\nafter the booking: ${after ?? '(no card)'}\n${requestList(api.requests)}`
      )
    ]
  },

  async 'catch-up-after-refusal'(t) {
    const { api, page, failed } = await booking(t, BOWLS, {
      answers: () => [409, { error: { code: 'full', message: BOWLS_GONE } }],
      later: () => [200, weekAfterBowls()]
    })
    if (failed) return [failed]
    await page.settle(50)
    const after = placesOf(page, BOWLS.title)
    const asked = api.requests
      .slice(api.requests.indexOf(api.bookings()[0]) + 1)
      .some((r) => r.method === 'GET')

    return [
      detail(
        'After a refusal, the screen asks for the list again',
        asked,
        'The server refused the booking because the workshop is full, but the screen did not ask for the list again. It still offers a place the server says is gone.',
        requestList(api.requests)
      ),
      detail(
        'The card then shows what the server has now',
        asked && after === 'Full',
        asked
          ? 'The list was asked for again, but the card of the refused workshop does not show what came back.'
          : 'Without a new list, the card still shows the places from before.',
        screen(page)
      ),
      detail(
        "The server's reason stays on the screen",
        roleTexts(page, 'alert').join(' ').includes(BOWLS_GONE),
        'The reason the server gave for refusing the booking is not on the screen any more. The form showed it at the end of the last issue.',
        screen(page)
      )
    ]
  },

  async 'keep-list-while-refreshing'(t) {
    const held = []
    const refused = await booking(t, BOWLS, {
      answers: () => [409, { error: { code: 'full', message: BOWLS_GONE } }],
      later: (request) => {
        held.push(request)
        return 'hold'
      }
    })
    if (refused.failed) return [refused.failed]
    const { page, api } = refused
    if (!held.length) {
      return [
        detail(
          'The screen asks for the list again',
          false,
          'After a refused booking the screen did not ask for the list again, so there was no refresh to watch. Task 2 is not right yet.',
          requestList(api.requests)
        )
      ]
    }
    const whileRefreshing = screen(page)
    const kept = JSON.stringify(titles(page)) === JSON.stringify(TITLES)
    for (const request of held) request.answer(200, weekAfterBowls())
    await page.settle(50)
    const afterRefresh = screen(page)
    const caughtUp = placesOf(page, BOWLS.title) === 'Full'
    page.close()

    const heldAfterBooking = []
    const booked = await booking(t, RAKU, {
      answers: () => [
        201,
        { booking: { id: 602, workshopId: RAKU.id, name: NAME }, workshop: { ...rakuAfter } }
      ],
      later: (request) => {
        heldAfterBooking.push(request)
        return 'hold'
      }
    })
    if (booked.failed) return [booked.failed]
    const keptAfterBooking =
      !heldAfterBooking.length || JSON.stringify(titles(booked.page)) === JSON.stringify(TITLES)
    const afterBookingOutput = screen(booked.page)

    return [
      detail(
        'The cards stay on the screen while the list is asked for again',
        kept && keptAfterBooking,
        'While the list was being asked for again, the cards went away. The screen already has a list it can show: keep it until the new one arrives.',
        kept
          ? `while asking again after a booking:\n${afterBookingOutput}`
          : `while asking again after a refusal:\n${whileRefreshing}`
      ),
      detail(
        'The new list replaces the old one when it arrives',
        caughtUp,
        'The new list arrived, but the cards still show the old one.',
        `after the new list:\n${afterRefresh}`
      )
    ]
  }
}

import {
  WEEK,
  bookButton,
  copy,
  detail,
  fillBooking,
  openApp,
  pageError,
  requestList,
  roleTexts,
  studio
} from '../../shared/checks-lib.mjs'

const RAKU = WEEK[0]
const NAME = 'Wren Hollis'
const FULL_NOW = 'Raku evening filled up a minute ago.'
const RAW = /failed to fetch|typeerror|unexpected token|syntaxerror|undefined|null|\[object/i

const booked = (status = 201) => [
  status,
  {
    booking: { id: 501, workshopId: RAKU.id, name: NAME },
    workshop: { ...RAKU, placesLeft: RAKU.placesLeft - 1 }
  }
]
const refusedFull = [409, { error: { code: 'full', message: FULL_NOW } }]

const formOutput = (page) =>
  [
    `name field: ${JSON.stringify(page.$('#booking-name')?.value ?? null)}`,
    `button: ${bookButton(page) ? `${bookButton(page).disabled ? 'off' : 'on'}` : '(none)'}`,
    `status: ${roleTexts(page, 'status').join(' | ') || '(none)'}`,
    `alert: ${roleTexts(page, 'alert').join(' | ') || '(none)'}`
  ].join('\n')

/** The screen with the week loaded and the form filled in; `onBooking` answers each booking. */
async function readyToBook(t, onBooking) {
  const api = studio((request) =>
    request.path === '/api/bookings' ? onBooking(request) : [200, copy(WEEK)]
  )
  const page = await openApp(t, api)
  await page.settle(50)
  const broken = pageError(page)
  if (broken) return { failed: broken }
  const missing = await fillBooking(page, RAKU.id, NAME)
  if (missing) return { failed: missing }
  return { api, page }
}

const noBooking = (api, page) =>
  detail(
    'Pressing Book a place sends the booking',
    false,
    page.reloads
      ? 'Pressing Book a place reloaded the page, so no booking reached the API. Task 1 is not right yet.'
      : 'Pressing Book a place sent nothing to POST /api/bookings. Task 1 is not right yet.',
    requestList(api.requests)
  )

export const checks = {
  async 'send-booking'(t) {
    const { api, page, failed } = await readyToBook(t, () => booked())
    if (failed) return [failed]
    await page.click(bookButton(page))
    await page.settle(50)

    const [sent] = api.bookings()
    const body = sent?.body
    let bodyProblem = ''
    if (!sent) bodyProblem = 'There was no booking to read.'
    else if (!/application\/json/i.test(sent.contentType)) {
      bodyProblem =
        'The booking has no Content-Type header that says its body is JSON, so the server cannot read it.'
    } else if (typeof body !== 'object' || body === null) {
      bodyProblem =
        'The body of the booking is not a JSON object. Turn the object into JSON text before you send it.'
    } else if (typeof body.workshopId === 'string') {
      bodyProblem =
        'workshopId arrived as text. The value of a select is always text, and the API wants the number of the workshop.'
    } else if (body.workshopId !== RAKU.id) {
      bodyProblem = 'workshopId is not the id of the workshop picked in the form.'
    } else if (typeof body.name !== 'string' || body.name.trim() !== NAME) {
      bodyProblem = 'name is not the name typed into the form.'
    }
    const said = roleTexts(page, 'status').join(' ')

    return [
      detail(
        'Sends the booking to POST /api/bookings without reloading the page',
        api.bookings().length === 1 && page.reloads === 0,
        page.reloads
          ? 'Pressing Book a place reloaded the page: the browser sent the form its own old way. Stop that, and send the booking yourself.'
          : api.bookings().length > 1
            ? 'One press sent the booking more than once.'
            : api.requests.some((r) => r.method === 'POST')
              ? 'A POST went out, but not to /api/bookings.'
              : 'Pressing Book a place sent nothing to POST /api/bookings.',
        `${requestList(api.requests)}\npage reloads: ${page.reloads}`
      ),
      detail(
        'The booking is JSON with the workshop id as a number and the name',
        !bodyProblem,
        bodyProblem,
        sent
          ? `Content-Type: ${sent.contentType || '(none)'}\nbody: ${typeof body === 'string' ? body : JSON.stringify(body)}`
          : requestList(api.requests)
      ),
      detail(
        'Says the place is booked, naming the person and the workshop',
        said.includes(NAME) && said.includes(RAKU.title),
        sent
          ? 'The server booked the place, but the form did not say so: no line with role="status" names the person and the workshop.'
          : 'No booking was sent, so there was nothing to confirm yet.',
        formOutput(page)
      )
    ]
  },

  async 'no-double'(t) {
    let waiting
    const { api, page, failed } = await readyToBook(t, (request) => {
      waiting = request
      return 'hold'
    })
    if (failed) return [failed]
    const button = bookButton(page)
    await page.click(button)
    if (!waiting) return [noBooking(api, page)]

    const offWhileSending = button.disabled
    const whileSending = formOutput(page)
    await page.click(button)
    await page.settle(20)
    const sentTimes = api.bookings().length
    waiting.answer(...booked())
    await page.settle(50)
    const after = bookButton(page)

    return [
      detail(
        'The button is off while the booking is on its way',
        offWhileSending,
        'While the booking was on its way, the Book a place button could still be pressed.',
        `while sending:\n${whileSending}`
      ),
      detail(
        'A second press sends nothing',
        sentTimes === 1,
        offWhileSending
          ? 'The button looked off, but a second press still sent the booking again.'
          : 'Pressing the button twice sent the booking twice. Someone on a slow connection would book two places.',
        requestList(api.bookings())
      ),
      detail(
        'The button works again once the answer is in',
        Boolean(after) && !after.disabled,
        'The booking was answered, but the button stayed off, so nobody can book another place.',
        `after the answer:\n${formOutput(page)}`
      )
    ]
  },

  async 'show-refusal'(t) {
    const plans = [refusedFull, booked()]
    const { api, page, failed } = await readyToBook(t, () => plans.shift() ?? booked())
    if (failed) return [failed]
    await page.click(bookButton(page))
    await page.settle(50)
    if (!api.bookings().length) return [noBooking(api, page)]

    const reasons = roleTexts(page, 'alert').join(' ')
    const keptName = page.$('#booking-name')?.value === NAME
    const buttonOn = !bookButton(page)?.disabled
    const claimedBooked = roleTexts(page, 'status').some((text) => text.includes(NAME))
    const afterRefusal = formOutput(page)

    await page.click(bookButton(page))
    await page.settle(50)
    const afterSecond = formOutput(page)
    const secondCleared =
      api.bookings().length === 2 && !roleTexts(page, 'alert').join(' ').includes(FULL_NOW)
    page.close()

    const offline = await readyToBook(t, () => 'network')
    if (offline.failed) return [offline.failed]
    await offline.page.click(bookButton(offline.page))
    await offline.page.settle(50)
    const offlineReason = roleTexts(offline.page, 'alert').join(' ')
    const offlineOutput = offline.page.errors.join('\n') || formOutput(offline.page)

    return [
      detail(
        "Shows the server's reason in an alert",
        reasons.includes(FULL_NOW) && !claimedBooked,
        claimedBooked
          ? 'The server refused the booking, but the form said it was booked.'
          : reasons
            ? 'The form showed an alert, but not the reason the server gave. The server says why it refused: show its words.'
            : 'The server refused the booking with status 409 and a reason, and the form showed no element with role="alert".',
        afterRefusal
      ),
      detail(
        'Keeps the name that was typed, and lets people press again',
        keptName && buttonOn,
        !keptName
          ? 'After the refusal the name field was empty. Whoever was booking has to type it all again.'
          : 'After the refusal the Book a place button stayed off, so nobody can try again.',
        afterRefusal
      ),
      detail(
        'A booking that works after a refusal clears the old reason',
        secondCleared,
        api.bookings().length < 2
          ? !keptName
            ? 'Pressing Book a place again sent nothing, because the name field had been emptied and the form needs a name.'
            : !buttonOn
              ? 'Pressing Book a place again sent nothing, because the button stayed off after the refusal.'
              : 'Pressing Book a place again after the refusal sent nothing.'
          : 'The second booking worked, but the reason for the first refusal is still on the screen.',
        afterSecond
      ),
      detail(
        'A booking that gets no answer says so in plain words',
        Boolean(offlineReason) && !RAW.test(offlineReason) && !offline.page.errors.length,
        offline.page.errors.length
          ? 'The booking got no answer, and the failure was never caught: the page stopped instead of showing an alert.'
          : offlineReason
            ? "The alert shows the browser's own words for the failure instead of a sentence a visitor can act on."
            : 'The booking got no answer at all, and the form showed no alert.',
        offlineOutput
      )
    ]
  }
}

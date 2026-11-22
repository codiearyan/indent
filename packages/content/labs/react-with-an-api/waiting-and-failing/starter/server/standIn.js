// A stand-in for the studio's API. The real API runs on the studio's own computer. This one runs
// inside the page, so the Browser panel has something to talk to: it answers every fetch to an
// address that starts with /api/, after a short wait, and passes other requests through.
// You do not need to edit this file. To see a slow answer or a failure, change server/settings.js.
//
//   GET  /api/workshops            this week's workshops, as an array
//   GET  /api/workshops?day=thu    only the workshops on that day
//   POST /api/bookings             books one place; the body is JSON: { workshopId, name }
//                                  answers 201 with { booking, workshop }, the workshop as it is now
//
// An error answer has a status of 400 or more and the body { error: { code, message } }.
import { settings } from './settings.js'
import { workshops as thisWeek } from './workshops.js'

const workshops = thisWeek.map((workshop) => ({ ...workshop }))
const passThrough = window.fetch.bind(window)
let sent = 0
let nextBookingId = 1

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const refuse = (status, code, message) => json(status, { error: { code, message } })

function bookedAtTheDesk() {
  const open = workshops.filter((workshop) => workshop.placesLeft > 0)
  if (open.length && Math.random() < 0.5) {
    open[Math.floor(Math.random() * open.length)].placesLeft -= 1
  }
}

function readBody(init) {
  const type = new Headers(init.headers).get('Content-Type') ?? ''
  if (!/application\/json/i.test(type)) return undefined
  try {
    return JSON.parse(init.body)
  } catch {
    return undefined
  }
}

function answer(method, url, body) {
  if (settings.busy) bookedAtTheDesk()
  if (method === 'GET' && url.pathname === '/api/workshops') {
    const day = url.searchParams.get('day')
    return json(
      200,
      workshops.filter((workshop) => !day || workshop.day === day)
    )
  }
  if (method === 'POST' && url.pathname === '/api/bookings') {
    if (typeof body !== 'object' || body === null) {
      return refuse(400, 'invalid', 'A booking needs a JSON body with workshopId and name.')
    }
    if (!Number.isInteger(body.workshopId)) {
      return refuse(400, 'invalid', 'workshopId must be the number of a workshop.')
    }
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return refuse(400, 'invalid', 'Please give the name to book the place under.')
    }
    const workshop = workshops.find((item) => item.id === body.workshopId)
    if (!workshop) return refuse(404, 'not_found', 'That workshop is not on this week.')
    if (workshop.placesLeft === 0) return refuse(409, 'full', `${workshop.title} is full.`)
    workshop.placesLeft -= 1
    const booking = { id: nextBookingId++, workshopId: workshop.id, name: body.name.trim() }
    return json(201, { booking, workshop: { ...workshop } })
  }
  return refuse(404, 'not_found', `Nothing answers ${method} ${url.pathname}.`)
}

window.fetch = (input, init = {}) => {
  const url = new URL(String(input?.url ?? input), window.location.href)
  if (!url.pathname.startsWith('/api/')) return passThrough(input, init)
  const method = (init.method ?? 'GET').toUpperCase()
  const label = `${method} ${url.pathname}${url.search}`
  sent += 1
  const failing = settings.failure === 'always' || (settings.failure === 'first' && sent === 1)
  const wait = settings.randomDelay ? 100 + Math.random() * 1900 : settings.delayMs
  const signal = init.signal

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', cancel)
      if (failing && settings.failAs === 'network') {
        console.info(`[studio api] ${label}: no answer, the network is down`)
        reject(new TypeError('Failed to fetch'))
        return
      }
      const response = failing
        ? refuse(503, 'unavailable', 'The studio server is restarting. Try again in a minute.')
        : answer(method, url, readBody(init))
      console.info(`[studio api] ${label}: ${response.status}`)
      resolve(response)
    }, wait)

    function cancel() {
      clearTimeout(timer)
      console.info(`[studio api] ${label}: cancelled`)
      reject(signal.reason)
    }
    if (signal?.aborted) cancel()
    else signal?.addEventListener('abort', cancel, { once: true })
  })
}

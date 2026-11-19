// Copied into the sandbox as .grader/drive.mjs. Drives the learner's functions with fake services.
import { sailingReport } from '../src/sailingReport.js'
import { loadDashboard } from '../src/dashboard.js'
import { saveBooking } from '../src/booking.js'
import { deferred, settle, track, watchUnhandled } from './helpers.mjs'

const unhandled = watchUnhandled()

const later = (answer) =>
  new Promise((resolve, reject) =>
    setImmediate(() => {
      try {
        resolve(answer())
      } catch (err) {
        reject(err)
      }
    })
  )

export async function rewriteCase(mode) {
  const events = []
  const services = {
    getSailing(route) {
      events.push(`getSailing ${route}`)
      return later(() => {
        events.push('sailing answered')
        if (mode === 'sailingFails') throw new Error('Timetable service is down')
        return { route, time: '09:30' }
      })
    },
    getSeaState(time) {
      events.push(`getSeaState ${time}`)
      return later(() => {
        if (mode === 'seaFails') throw new Error('Sea sensor offline')
        return 'choppy'
      })
    }
  }
  const source = sailingReport.toString()
  const outcome = track(sailingReport('quay-gull', services))
  await settle()
  return {
    isAsync: sailingReport.constructor.name === 'AsyncFunction',
    usesAwait: /\bawait\b/.test(source),
    usesThen: /\.then\s*\(/.test(source),
    events,
    ...outcome,
    unhandled
  }
}

const SAILINGS = [
  { id: 'S1', time: '09:30' },
  { id: 'S2', time: '13:00' }
]

// Resolves the fake services one at a time in `order`, recording which calls had started after each step.
export async function dashboardCase(order, sailings = SAILINGS, weatherFails = false) {
  const events = []
  const pending = {}
  const fake = (name) => (arg) => {
    events.push(`${name} ${arg}`)
    pending[name] = deferred()
    return pending[name].promise
  }
  const services = { getSailings: fake('getSailings'), getWeather: fake('getWeather'), getCrew: fake('getCrew') }
  const answers = { getSailings: sailings, getWeather: 'fog', getCrew: ['Odile', 'Ines'] }
  const outcome = track(loadDashboard('quay-gull', services))
  await settle()
  const steps = [{ after: 'start', started: [...events] }]
  const done = new Set()
  for (let round = 0; round < 3; round++) {
    for (const name of order) {
      if (!pending[name] || done.has(name)) continue
      done.add(name)
      if (name === 'getWeather' && weatherFails) pending[name].reject(new Error('Weather station offline'))
      else pending[name].resolve(answers[name])
      await settle()
      steps.push({ after: name, started: [...events] })
    }
  }
  return { steps, ...outcome, unhandled }
}

export async function bookingCase(mode) {
  const events = []
  const services = {
    storeBooking(booking) {
      events.push(`store ${booking.id}`)
      return later(() => {
        if (mode === 'storeFails') {
          events.push('store failed')
          throw new Error('Booking database is busy')
        }
        events.push('stored')
      })
    },
    emailTicket(booking) {
      events.push(`email ${booking.id}`)
      return later(() => {
        if (mode === 'emailFails') {
          events.push('email failed')
          throw new Error('Mail server refused')
        }
        events.push('emailed')
      })
    },
    unlockSeat(seat) {
      events.push(`unlock ${seat}`)
    }
  }
  const booking = { id: 'B7', name: 'Mira', email: 'mira@example.com', seat: '4A' }
  const outcome = track(saveBooking(booking, services))
  await settle()
  return { events, ...outcome, unhandled }
}

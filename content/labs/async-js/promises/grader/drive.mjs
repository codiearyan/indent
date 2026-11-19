// Copied into the sandbox as .grader/drive.mjs. Drives the learner's functions with fake services.
import { loadTides } from '../src/loadTides.js'
import { nextHighTide } from '../src/nextHighTide.js'
import { sailingReport } from '../src/sailingReport.js'
import { settle, track, watchUnhandled } from './helpers.mjs'

const unhandled = watchUnhandled()

const TABLE = [
  { time: '02:10', height: 1.0 },
  { time: '04:52', height: 3.6 },
  { time: '11:07', height: 0.9 },
  { time: '17:15', height: 3 },
  { time: '23:31', height: 1.1 }
]

export async function wrapCase(mode) {
  const ports = []
  const read = (port, callback) => {
    ports.push(port)
    const answer = () =>
      mode === 'fail' ? callback(new Error('Tide gauge offline')) : callback(null, TABLE)
    if (mode === 'sync') answer()
    else setImmediate(answer)
  }
  const result = loadTides('quay', read)
  const outcome = track(result)
  await settle()
  return { isPromise: result instanceof Promise, ports, ...outcome, unhandled }
}

export async function chainCase(after, fail) {
  const ports = []
  const load = (port) => {
    ports.push(port)
    return new Promise((resolve, reject) =>
      setImmediate(() => (fail ? reject(new Error('Tide gauge offline')) : resolve(TABLE)))
    )
  }
  const result = nextHighTide('gull', after, load)
  const outcome = track(result)
  await settle()
  return { isPromise: result instanceof Promise, ports, ...outcome, unhandled }
}

export async function reportCase(mode) {
  const events = []
  const services = {
    getSailing(route) {
      events.push(`getSailing ${route}`)
      return new Promise((resolve, reject) =>
        setImmediate(() => {
          events.push('sailing answered')
          if (mode === 'sailingFails') reject(new Error('Timetable service is down'))
          else resolve({ route, time: '09:30' })
        })
      )
    },
    getSeaState(time) {
      events.push(`getSeaState ${time}`)
      return new Promise((resolve, reject) =>
        setImmediate(() => {
          if (mode === 'seaFails') reject(new Error('Sea sensor offline'))
          else resolve('choppy')
        })
      )
    }
  }
  const result = sailingReport('quay-gull', services)
  const outcome = track(result)
  await settle()
  return { isPromise: result instanceof Promise, events, ...outcome, unhandled }
}

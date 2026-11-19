// Fake Tidewell services. They answer after a short delay, the way the real ones do on a good day.
const later = (ms, answer) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(answer())
      } catch (err) {
        reject(err)
      }
    }, ms)
  })

const routes = { 'quay-gull': 25, 'quay-heron': 40, 'gull-heron': 30 }

export function getRoute(id) {
  return later(100 + id.length * 20, () => {
    if (!(id in routes)) throw new Error(`Route ${id} is closed`)
    return { id, minutes: routes[id] }
  })
}

export function pingPort(port) {
  return later(port.length * 60, () => {
    if (port === 'reef') throw new Error('No answer from reef')
    return port.length * 60
  })
}

export function getForecast() {
  return later(1200, () => 'Wind west 4, sea slight')
}

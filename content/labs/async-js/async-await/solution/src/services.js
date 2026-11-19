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

export function getSailing(route) {
  return later(200, () => {
    if (route === 'quay-heron') throw new Error('Timetable service is down')
    return { route, time: '09:30' }
  })
}

export function getSeaState(time) {
  return later(200, () => (time < '12:00' ? 'calm' : 'choppy'))
}

export function getSailings(route) {
  return later(400, () => [
    { id: 'S1', route, time: '09:30' },
    { id: 'S2', route, time: '13:00' }
  ])
}

export function getWeather(route) {
  return later(400, () => (route === 'quay-gull' ? 'light rain' : 'sunny'))
}

export function getCrew(sailingId) {
  return later(300, () => (sailingId === 'S1' ? ['Odile', 'Ines'] : ['Pavel']))
}

export function storeBooking(booking) {
  return later(150, () => {
    if (!booking.name) throw new Error('A booking needs a name')
  })
}

export function emailTicket(booking) {
  return later(150, () => {
    if (!booking.email.includes('@')) throw new Error(`Cannot email ${booking.email}`)
  })
}

export function unlockSeat(seat) {
  console.log(`  (seat ${seat} unlocked)`)
}

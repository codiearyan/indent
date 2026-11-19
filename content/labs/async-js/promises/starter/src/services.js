// Fake Tidewell services. They answer after a short delay, the way the real ones do on a good day.
const tideTables = {
  quay: [
    { time: '04:52', height: 3.6 },
    { time: '11:07', height: 0.9 },
    { time: '17:15', height: 3.4 },
    { time: '23:31', height: 1.1 }
  ],
  gull: [
    { time: '05:20', height: 2.8 },
    { time: '11:35', height: 1.0 },
    { time: '17:44', height: 2.9 }
  ]
}

// Old callback style: callback(error) or callback(null, table).
export function readTideTable(port, callback) {
  setTimeout(() => {
    const table = tideTables[port]
    if (table) callback(null, table)
    else callback(new Error(`No tide table for ${port}`))
  }, 300)
}

export function getSailing(route) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (route === 'quay-heron') reject(new Error('Timetable service is down'))
      else resolve({ route, time: '09:30' })
    }, 200)
  })
}

export function getSeaState(time) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(time < '12:00' ? 'calm' : 'choppy'), 200)
  })
}

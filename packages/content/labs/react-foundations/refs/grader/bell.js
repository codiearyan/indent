// The check's bell: it writes down every ring and every line of the log, through window.bell.
const bell = { rings: 0, log: [] }
window.bell = bell

export function ring() {
  bell.rings++
}

export function logRide(rings) {
  bell.log.push(rings)
}

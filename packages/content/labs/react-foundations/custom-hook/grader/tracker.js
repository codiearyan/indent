// The check's tracker: it writes down every follow() and every stop, and sends reports only when
// the check says so, through window.tracker.
const tracker = { follows: [] }
window.tracker = tracker

export function follow(number, onStop) {
  // While React is still drawing a component for the first time, nothing of it is on the page yet.
  const onScreen = document.getElementById('root').children.length > 0
  const entry = { number, onStop, active: true, stops: 0, onScreen }
  tracker.follows.push(entry)
  return () => {
    entry.stops++
    entry.active = false
  }
}

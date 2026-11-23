// A page of the check's own that draws one part of the learner's order screen at a time, inside
// React's Profiler, counting each time React puts it on the page.
import { createElement as h, Profiler } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { orderStore } from '../src/order-store.js'
import * as screen from '../src/OrderScreen.jsx'

window.screen = screen
window.store = orderStore
window.commits = 0

// React reports an error thrown while drawing here, not as an uncaught error of the page.
window.renderErrors = []
const root = createRoot(document.getElementById('root'), {
  onUncaughtError: (error) => window.renderErrors.push(String(error?.message ?? error))
})
const onRender = () => {
  window.commits += 1
  if (window.commits > 200) {
    window.overAndOver = true
    throw new Error('The check stopped a component that was drawn over and over.')
  }
}
window.showPart = (name) => flushSync(() => root.render(h(Profiler, { id: name, onRender }, h(screen[name]))))

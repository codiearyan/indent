// A page of the check's own: components that call the learner's useStore with selectors of the
// check's own, each counting its draws.
import { createElement as h, Fragment } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { listening, orderStore } from '../src/order-store.js'
import { shallowEqual } from '../src/store.js'
import * as hook from '../src/use-store.js'

const SELECTORS = {
  jobs: (state) => state.jobs,
  ink: (state) => state.ink,
  count: (state) => state.lines.length,
  both: (state) => ({ jobs: state.jobs, ink: state.ink })
}

window.hook = hook
window.draws = {}
window.store = orderStore
window.listening = listening

const probes = {}
function probe(name, pick, withEqual) {
  probes[name] ??= function Probe() {
    window.draws[name] = (window.draws[name] ?? 0) + 1
    // A component drawn again and again without end never hands the check its turn back: stop it.
    if (window.draws[name] > 200) {
      window.overAndOver = true
      throw new Error('The check stopped a component that was drawn over and over.')
    }
    const part = withEqual ? hook.useStore(SELECTORS[pick], shallowEqual) : hook.useStore(SELECTORS[pick])
    return h('p', { id: name }, part === undefined ? '(nothing)' : JSON.stringify(part))
  }
  return probes[name]
}

// React reports an error thrown while drawing here, not as an uncaught error of the page.
window.renderErrors = []
const root = createRoot(document.getElementById('root'), {
  onUncaughtError: (error) => window.renderErrors.push(String(error?.message ?? error))
})
window.show = (list) =>
  flushSync(() =>
    root.render(h(Fragment, null, ...list.map(([name, pick, withEqual]) => h(probe(name, pick, withEqual), { key: name }))))
  )
window.clear = () => flushSync(() => root.render(null))

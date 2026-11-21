// Copied into the sandbox as .grader/drive.mjs. Runs store scenarios, each in its own try and catch.
import { createBoatStore } from '../src/store.js'

const seed = () => [
  { code: 'TW-01', name: 'Heron', type: 'single', hourlyCents: 1800, available: true },
  { code: 'TW-02', name: 'Otter', type: 'double', hourlyCents: 2600, available: true },
  { code: 'TW-03', name: 'Pike', type: 'single', hourlyCents: 1800, available: false }
]
const kestrel = () => ({ code: 'TW-09', name: 'Kestrel', type: 'single', hourlyCents: 1900, available: true })

const scenarios = {
  list: () => createBoatStore(seed()).list(),
  get: () => {
    const store = createBoatStore(seed())
    return { found: store.get('TW-02'), missing: store.get('TW-99') ?? 'undefined' }
  },
  create: () => {
    const store = createBoatStore(seed())
    const created = store.create(kestrel())
    return { created, found: store.get('TW-09'), count: store.list().length }
  },
  duplicate: () => {
    const store = createBoatStore(seed())
    store.create({ ...seed()[0], name: 'Other Heron' })
    return 'no error'
  },
  update: () => {
    const store = createBoatStore(seed())
    const updated = store.update('TW-02', { hourlyCents: 2700, code: 'TW-77' })
    return {
      updated,
      found: store.get('TW-02'),
      moved: store.get('TW-77') ?? 'undefined',
      missing: store.update('TW-99', { name: 'Ghost' }) ?? 'undefined'
    }
  },
  remove: () => {
    const store = createBoatStore(seed())
    return {
      removed: store.remove('TW-03'),
      after: store.get('TW-03') ?? 'undefined',
      again: store.remove('TW-03'),
      count: store.list().length
    }
  },
  copies: () => {
    const boats = seed()
    const store = createBoatStore(boats)
    boats[0].name = 'changed seed'
    store.get('TW-02').name = 'changed get'
    store.list()[2].name = 'changed list'
    const input = kestrel()
    store.create(input).name = 'changed create result'
    input.name = 'changed create input'
    store.update('TW-09', { available: false }).name = 'changed update result'
    return store.list().map((b) => b.name)
  },
  separate: () => {
    const shared = seed()
    const a = createBoatStore(shared)
    const b = createBoatStore(shared)
    a.remove('TW-01')
    return b.list().length
  }
}

export function runScenarios() {
  const out = {}
  for (const [name, run] of Object.entries(scenarios)) {
    try {
      out[name] = { value: run() }
    } catch (err) {
      const { name: errName, message, status, code } = err
      out[name] = { thrown: { name: errName, message, status, code } }
    }
  }
  return out
}

// Copied into the sandbox as .grader/drive.mjs. Each export runs one scenario and returns what happened.
const load = async () => (await import(new URL('../src/emitter.ts', import.meta.url).href)).Emitter

function recorder() {
  const log = []
  const listener = (name) => (...args) => log.push([name, ...args].join(' '))
  return { log, listener }
}

export async function inOrder() {
  const Emitter = await load()
  const { log, listener } = recorder()
  const emitter = new Emitter()
  emitter.on('save', listener('a'))
  emitter.on('save', listener('b'))
  const returned = emitter.emit('save', 1, 'two')
  return { returned, log }
}

export async function noListeners() {
  const Emitter = await load()
  const { log, listener } = recorder()
  const emitter = new Emitter()
  const first = emitter.emit('save')
  emitter.on('save', listener('a'))
  const other = emitter.emit('load')
  return { returned: [first, other], log }
}

export async function offRemoves() {
  const Emitter = await load()
  const { log, listener } = recorder()
  const emitter = new Emitter()
  const a = listener('a')
  const b = listener('b')
  emitter.on('save', a)
  emitter.on('save', b)
  const off = [emitter.off('save', a), emitter.off('save', a), emitter.off('load', b)]
  emitter.emit('save')
  return { off, log, count: emitter.listenerCount('save') }
}

export async function unsubscribe() {
  const Emitter = await load()
  const { log, listener } = recorder()
  const emitter = new Emitter()
  const stop = emitter.on('save', listener('a'))
  emitter.on('save', listener('b'))
  stop()
  stop()
  const returned = emitter.emit('save')
  return { returned, log, count: emitter.listenerCount('save') }
}

export async function sameListenerTwice() {
  const Emitter = await load()
  const { log, listener } = recorder()
  const emitter = new Emitter()
  const a = listener('a')
  emitter.on('save', a)
  emitter.on('save', a)
  emitter.emit('save', 1)
  emitter.off('save', a)
  emitter.emit('save', 2)
  return { log, count: emitter.listenerCount('save'), unknown: emitter.listenerCount('nothing') }
}

export async function onceFiresOnce() {
  const Emitter = await load()
  const { log, listener } = recorder()
  const emitter = new Emitter()
  emitter.once('save', listener('a'))
  const returned = [emitter.emit('save', 1), emitter.emit('save', 2)]
  return { returned, log, count: emitter.listenerCount('save') }
}

export async function onceMixed() {
  const Emitter = await load()
  const { log, listener } = recorder()
  const emitter = new Emitter()
  emitter.on('save', listener('a'))
  emitter.once('save', listener('b'))
  emitter.on('save', listener('c'))
  emitter.emit('save', 1)
  emitter.emit('save', 2)
  return { log }
}

export async function onceRemovedEarly() {
  const Emitter = await load()
  const { log, listener } = recorder()
  const emitter = new Emitter()
  const a = listener('a')
  emitter.once('save', a)
  const off = emitter.off('save', a)
  const stop = emitter.once('save', listener('b'))
  stop()
  const returned = emitter.emit('save')
  return { off, returned, log }
}

export async function onceReentrant() {
  const Emitter = await load()
  const log = []
  const emitter = new Emitter()
  emitter.once('save', (n) => {
    log.push(`a ${n}`)
    if (n < 5) emitter.emit('save', n + 1)
  })
  try {
    emitter.emit('save', 1)
  } catch (err) {
    log.push(`threw ${err.message}`)
  }
  return { log }
}

export async function addedDuringEmit() {
  const Emitter = await load()
  const { log, listener } = recorder()
  const emitter = new Emitter()
  emitter.on('save', () => {
    log.push('a')
    emitter.on('save', listener('late'))
  })
  emitter.emit('save')
  const first = [...log]
  log.length = 0
  emitter.emit('save')
  return { first, second: log }
}

export async function removedDuringEmit() {
  const Emitter = await load()
  const { log, listener } = recorder()
  const emitter = new Emitter()
  const c = listener('c')
  emitter.on('save', () => {
    log.push('a')
    emitter.off('save', c)
  })
  emitter.on('save', listener('b'))
  emitter.on('save', c)
  emitter.emit('save')
  return { log, count: emitter.listenerCount('save') }
}

export async function removesItself() {
  const Emitter = await load()
  const { log, listener } = recorder()
  const emitter = new Emitter()
  const a = () => {
    log.push('a')
    emitter.off('save', a)
  }
  emitter.on('save', a)
  emitter.on('save', listener('b'))
  emitter.on('save', listener('c'))
  emitter.emit('save')
  const first = [...log]
  log.length = 0
  emitter.emit('save')
  return { first, second: log }
}

export async function errorsWithHandler() {
  const Emitter = await load()
  const log = []
  const errors = []
  const emitter = new Emitter({ onError: (error, event) => errors.push([error.message, event]) })
  emitter.on('save', () => {
    log.push('a')
    throw new Error('disk full')
  })
  emitter.on('save', () => log.push('b'))
  const returned = emitter.emit('save')
  return { returned, log, errors }
}

export async function errorsWithoutHandler() {
  const Emitter = await load()
  const log = []
  const emitter = new Emitter()
  emitter.on('save', () => {
    log.push('a')
    throw new Error('first')
  })
  emitter.on('save', () => {
    log.push('b')
    throw new Error('second')
  })
  emitter.on('save', () => log.push('c'))
  let thrown = null
  try {
    emitter.emit('save')
  } catch (err) {
    thrown = err.message
  }
  return { log, thrown }
}

export async function onceThatThrows() {
  const Emitter = await load()
  let runs = 0
  const emitter = new Emitter({ onError: () => {} })
  emitter.once('save', () => {
    runs++
    throw new Error('bad')
  })
  emitter.emit('save')
  emitter.emit('save')
  return { runs, count: emitter.listenerCount('save') }
}

export async function manyRemovals(count) {
  const Emitter = await load()
  const emitter = new Emitter()
  let calls = 0
  for (let i = 0; i < count; i++) {
    const stop = emitter.on('tick', () => {
      calls++
      stop()
    })
  }
  const started = performance.now()
  emitter.emit('tick')
  emitter.emit('tick')
  for (let i = 0; i < count; i++) emitter.once('tock', () => calls++)
  emitter.emit('tock')
  return { calls, left: emitter.listenerCount('tick') + emitter.listenerCount('tock'), ms: Math.round(performance.now() - started) }
}

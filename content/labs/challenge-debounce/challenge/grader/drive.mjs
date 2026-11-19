// Copied into the sandbox as .grader/drive.mjs. Replays calls against fake timers and logs when fn ran.
// steps: [atMs, 'call', ...args] | [atMs, 'cancel'] | [atMs, 'flush']
const load = async (file, name) => (await import(new URL(`../${file}`, import.meta.url).href))[name]

function fakeTimers() {
  let now = 0
  let nextId = 1
  let started = 0
  const pending = new Map()
  const timers = {
    setTimeout(callback, ms) {
      started++
      const id = nextId++
      pending.set(id, { at: now + Math.max(0, ms), callback })
      return id
    },
    clearTimeout(id) {
      pending.delete(id)
    }
  }
  function advanceTo(time) {
    for (;;) {
      let next = null
      for (const [id, timer] of pending) {
        if (timer.at <= time && (!next || timer.at < next[1].at)) next = [id, timer]
      }
      if (!next) break
      pending.delete(next[0])
      now = next[1].at
      next[1].callback()
    }
    now = time
  }
  return { timers, advanceTo, now: () => now, started: () => started, left: () => pending.size }
}

export async function replay(file, name, waitMs, options, steps) {
  const create = await load(file, name)
  const clock = fakeTimers()
  const calls = []
  const target = (...args) => calls.push([clock.now(), ...args])
  const wrapped = create(target, waitMs, { ...options, timers: clock.timers })
  for (const [at, action, ...args] of steps) {
    clock.advanceTo(at)
    if (action === 'call') wrapped(...args)
    else wrapped[action]()
  }
  clock.advanceTo((steps.at(-1)?.[0] ?? 0) + waitMs * 10)
  return calls
}

export async function realClock(file, name) {
  const create = await load(file, name)
  const calls = []
  const wrapped = create((key) => calls.push(key), 30)
  wrapped('a')
  wrapped('b')
  wrapped('c')
  await new Promise((resolve) => setTimeout(resolve, 150))
  return calls
}

export async function stream(file, count, everyMs, waitMs) {
  const throttle = await load(file, 'throttle')
  const clock = fakeTimers()
  let calls = 0
  let last = null
  const wrapped = throttle((i) => {
    calls++
    last = i
  }, waitMs, { timers: clock.timers })
  const begun = performance.now()
  for (let i = 0; i < count; i++) {
    clock.advanceTo(i * everyMs)
    wrapped(i)
  }
  clock.advanceTo(count * everyMs + waitMs * 10)
  return { calls, last, timers: clock.started(), ms: Math.round(performance.now() - begun) }
}

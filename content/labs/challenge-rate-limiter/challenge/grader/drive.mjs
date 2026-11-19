// Copied into the sandbox as .grader/drive.mjs. Replays timed calls against a fake clock.
// steps: [atMs, method, ...args]. Numbers are rounded to 6 decimals so float noise does not matter.
export async function replay(file, factory, options, steps) {
  const mod = await import(new URL(`../${file}`, import.meta.url).href)
  let time = 0
  const target = mod[factory]({ ...options, now: () => time })
  return steps.map(([at, method, ...args]) => {
    time = at
    const value = target[method](...args)
    return typeof value === 'number' ? Math.round(value * 1e6) / 1e6 : value
  })
}

export async function defaultClock(file, factory, options, method) {
  const mod = await import(new URL(`../${file}`, import.meta.url).href)
  return mod[factory](options)[method]('k')
}

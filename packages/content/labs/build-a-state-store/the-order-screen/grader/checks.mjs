import { clean, codeUses, detail, errorsOf, explain, loadProblem, openHarness } from './react.mjs'

// useStore is judged on the check's own store (a correct one, with a count of who listens), so
// it does not depend on the store files. The screen is judged with a correct useStore, so task 3
// does not depend on tasks 1 and 2.
const HOOK_FILES = { 'src/store.js': 'solution/src/store.js', 'src/order-store.js': 'grader/order-store.js' }
const SCREEN_FILES = {
  'src/use-store.js': 'solution/src/use-store.js',
  'src/order.js': 'grader/order.js',
  'src/price-list.js': 'grader/price-list.js'
}

// What the check's own order starts with, in grader/order.js.
const START_FIELDS = { paper: 'linen', note: 'Ring the bell' }
const shownBy = (page, name) => clean(page.$(`#${name}`)?.textContent ?? '(not on the page)')
const drawsOf = (page, name) => page.window.draws[name] ?? 0

/** One detail when the page stopped on an error since `before`, or null. */
function stopped(page, before, what = 'The check\'s components run without errors') {
  const errors = errorsOf(page)
  if (errors.length <= before) return null
  return detail(what, false, explain(errors[before]), errors.slice(before).join('\n'))
}

async function hookPage(t) {
  const { page, problem } = await openHarness(t, 'hook-harness.jsx', HOOK_FILES)
  if (problem) return { problem }
  if (typeof page.window.hook?.useStore !== 'function') {
    return { problem: detail('use-store.js exports useStore', false, 'use-store.js has no export called useStore. Keep the name and export it.', `exports: ${Object.keys(page.window.hook ?? {}).join(', ') || '(none)'}`) }
  }
  return { page }
}

/**
 * Opens a fresh page with a fresh store, draws the check's probes, makes each change in turn and
 * notes what they showed and how often they drew.
 */
async function play(t, probes, changes) {
  const { page, problem: notLoaded } = await hookPage(t)
  if (notLoaded) return { problem: notLoaded }
  const before = errorsOf(page).length
  page.window.show(probes)
  await page.settle()
  const names = probes.map(([name]) => name)
  const note = (label) => `${label}: ${names.map((name) => `${name} shows ${shownBy(page, name)}, drawn ${drawsOf(page, name)} time(s)`).join('; ')}`
  const log = [note('first draw')]
  const steps = [{ shown: Object.fromEntries(names.map((n) => [n, shownBy(page, n)])), draws: Object.fromEntries(names.map((n) => [n, drawsOf(page, n)])) }]
  for (const [label, part] of changes) {
    if (stopped(page, before)) break
    page.window.store.setState(part)
    await page.settle()
    log.push(note(label))
    steps.push({ shown: Object.fromEntries(names.map((n) => [n, shownBy(page, n)])), draws: Object.fromEntries(names.map((n) => [n, drawsOf(page, n)])) })
  }
  return { page, steps, output: log.join('\n'), problem: stopped(page, before) }
}

const NOT_BUILT_ON =
  'useStore should be built on useSyncExternalStore, React\'s own hook for state kept outside React. A copy kept in useState by an effect starts listening only after the first draw, so a change made in between is missed, and React cannot read the store while it draws.'

export const checks = {
  async hook(t) {
    const results = []
    const usesTool = await codeUses(t, 'src/use-store.js', 'useSyncExternalStore')
    const one = await play(t, [['jobs', 'jobs']], [['jobs set to 3', { jobs: 3 }], ['jobs set to 7', { jobs: 7 }]])
    if (one.problem) return [one.problem]
    const seen = one.steps.map((s) => s.shown.jobs)
    results.push(
      detail(
        'Shows its part, and the part after each change',
        seen.join() === '2,3,7',
        seen[0] === '(nothing)'
          ? 'useStore returned nothing. Return the part the selector picks out of the state of orderStore, the one store, imported from order-store.js.'
          : seen[0] !== '2'
            ? 'The first draw should show the part the selector picks out of the state now.'
            : 'The component should be drawn again when its part changes, showing the new part. Hand React the store\'s subscribe, so React is told after every change.',
        `a component of the check's own shows useStore((state) => state.jobs)\n${one.output}`
      )
    )

    const two = await play(t, [['jobs2', 'jobs'], ['ink', 'ink']], [['ink set to blue', { ink: 'blue' }], ['jobs set to 9', { jobs: 9 }]])
    if (two.problem) return [...results, two.problem]
    const last = two.steps.at(-1).shown
    results.push(
      detail(
        'Each component gets its own part',
        last.jobs2 === '9' && last.ink === '"blue"',
        'Each component should show the part its own selector picks. Call the selector it was given, on the state now.',
        `two components: one shows useStore((state) => state.jobs), the other useStore((state) => state.ink)\n${two.output}`
      )
    )

    const listeningBefore = two.page.window.listening()
    two.page.window.clear()
    await two.page.settle()
    const listeningAfter = two.page.window.listening()
    results.push(
      detail(
        'Stops listening when the component goes',
        listeningBefore > 0 && listeningAfter === 0,
        listeningBefore === 0
          ? 'The store had no listener while the components were on the page, so no change could reach them. Hand React the store\'s subscribe.'
          : 'The components were taken off the page, and the store still had listeners for them. Hand React a subscribe that returns the stop function, and React calls it when the component goes.',
        `listening while on the page: ${listeningBefore}\nlistening after they were taken off: ${listeningAfter}`
      )
    )

    results.push(detail('Built on useSyncExternalStore', usesTool, NOT_BUILT_ON, usesTool ? 'use-store.js uses useSyncExternalStore' : 'use-store.js does not use useSyncExternalStore'))
    return results
  },

  async draws(t) {
    const results = []
    const drew = (steps, name) => steps.map((s) => s.draws[name]).join(', ')

    const a = await play(t, [['jobs', 'jobs']], [['ink set', { ink: 'blue' }], ['stock set', { stock: 'kraft' }], ['jobs set to 3', { jobs: 3 }], ['jobs set to 4', { jobs: 4 }]])
    if (a.problem) return [a.problem]
    const aDraws = drew(a.steps, 'jobs')
    results.push(
      detail(
        'Drawn once for each change of its part, and never for another part',
        aDraws === '1, 1, 1, 2, 3' && a.steps.at(-1).shown.jobs === '4',
        aDraws.startsWith('1, 2')
          ? 'The component was drawn again when ink changed, though it shows only jobs. Hand React the part, not the whole state: React compares what it reads with Object.is and skips the draw when it is the same.'
          : aDraws.split(', ').some((n, i, all) => i > 0 && Number(n) - Number(all[i - 1]) > 1)
            ? 'One change drew the component more than once. Let React read the part straight from the store, instead of keeping a copy in state as well.'
            : 'The component should be drawn once when it is put on the page, and once more after each change of jobs.',
        `a component shows useStore((state) => state.jobs) and counts its draws\n${a.output}`
      )
    )

    const b = await play(t, [['count', 'count']], [['a new array of the same lines', { lines: ['menu', 'tag'] }], ['one line more', { lines: ['menu', 'tag', 'card'] }]])
    if (b.problem) return [...results, b.problem]
    const bDraws = drew(b.steps, 'count')
    results.push(
      detail(
        'A number worked out each time',
        bDraws === '1, 1, 2' && b.steps.at(-1).shown.count === '3',
        'The count stayed 2 when the lines became a new array of the same two lines, so the component should not be drawn again until a line is added.',
        `a component shows useStore((state) => state.lines.length)\n${b.output}`
      )
    )

    const c = await play(t, [['both', 'both', 'shallow']], [['stock set', { stock: 'linen-2' }], ['ink set to red', { ink: 'red' }]])
    if (c.problem) return [...results, c.problem]
    const cDraws = drew(c.steps, 'both')
    results.push(
      detail(
        'A part made new each time, with isEqual',
        cDraws === '1, 1, 2' && c.steps.at(-1).shown.both === '{"jobs":2,"ink":"red"}',
        cDraws.startsWith('1, 2')
          ? 'The selector makes a new object on every read, and the component was drawn again when stock changed. When isEqual says the part is the same as last time, hand React the part from last time, the very object, and React skips the draw.'
          : 'The component should be drawn once more, when ink changes, showing the new part.',
        `a component shows useStore((state) => ({ jobs: state.jobs, ink: state.ink }), shallowEqual)\n${c.output}`
      )
    )

    const e = await play(t, [['byJobs', 'both', 'jobs']], [['ink set to red', { ink: 'red' }], ['jobs set to 5', { jobs: 5 }]])
    if (e.problem) return [...results, e.problem]
    const eDraws = drew(e.steps, 'byJobs')
    const eShown = e.steps.map((s) => s.shown.byJobs)
    results.push(
      detail(
        'isEqual decides what counts as the same',
        eDraws === '1, 1, 2' && eShown[1] === '{"jobs":2,"ink":"black"}' && eShown[2] === '{"jobs":5,"ink":"red"}',
        'This isEqual calls two parts the same when their jobs are the same, so the change of ink should not draw the component, and it keeps showing the part from before. Ask the isEqual useStore was given, not a comparison of your own.',
        `a component shows useStore((state) => ({ jobs: state.jobs, ink: state.ink }), sameJobs), where sameJobs compares only jobs\n${e.output}`
      )
    )

    const d = await play(t, [['jobs3', 'jobs'], ['ink3', 'ink']], [['ink set to green', { ink: 'green' }]])
    if (d.problem) return [...results, d.problem]
    const end = d.steps.at(-1).draws
    results.push(
      detail(
        'Only the component whose part changed is drawn',
        end.jobs3 === 1 && end.ink3 === 2,
        'Only the component that shows ink should be drawn again when ink changes; the one that shows jobs stays as it was.',
        `two components: one shows jobs, the other ink\n${d.output}`
      )
    )
    return results
  },

  async screen(t) {
    // The screen runs on a correct useStore, so a part drawn without end has a selector that makes
    // a new object on every read and no isEqual.
    const ENDLESS = /Maximum update depth|getSnapshot should be cached|drawn over and over/
    const own = (problem) =>
      problem && ENDLESS.test(problem.output ?? '')
        ? { ...problem, message: 'React drew a part of the screen again and again until it gave up. One of its selectors makes a new object on every read, and useStore was given no isEqual, so every read looked like a change. Pass shallowEqual as the second argument, or call useStore once for each value.' }
        : problem
    const results = []
    const dir = await t.sandbox(Object.fromEntries(Object.entries(SCREEN_FILES).map(([rel, src]) => [rel, t.chapterPath(src)])))
    const whole = await t.page('index.html', { dir })
    await whole.settle()
    if (whole.errors.length) return [own(await loadProblem(whole, dir, 'src/main.jsx'))]

    // Total reads the store, so it shows a total only once the screen has loaded the prices into it.
    const amount = clean(whole.$('.amount')?.textContent ?? '(no total)')
    results.push(
      detail(
        'The screen loads the prices into the store',
        amount === '£12.00',
        'The total should show the order\'s total once the screen is open. OrderScreen loads the prices once, from an effect, with the store\'s loadPrices action, and Total reads them from the store.',
        `the total on the opened screen: ${amount}`
      )
    )

    // The whole screen: the count in the header against the lines in the basket, after each click.
    const count = () => clean(whole.$('.count')?.textContent ?? '(no count)')
    const lines = () => whole.$$('.basket li').length
    const trail = [`start: header says ${count()}, basket has ${lines()} line(s)`]
    const agree = [count() === `Basket (${lines()})`]
    for (const [label, selector] of [
      ['add menus', '.catalog button[data-item="menu"]'],
      ['add tags, already in the basket', '.catalog button[data-item="tag"]'],
      ['remove menus', '.basket button[data-item="menu"]']
    ]) {
      const button = whole.$(selector)
      if (!button) {
        trail.push(`${label}: no button ${selector} on the page`)
        agree.push(false)
        continue
      }
      await whole.click(button)
      trail.push(`${label}: header says ${count()}, basket has ${lines()} line(s)`)
      agree.push(count() === `Basket (${lines()})`)
    }
    // The page's own root reports an error while drawing only as a warning in the console.
    const drawError = whole.logs.find((line) => /An error occurred in the <\w+> component/.test(line))
    if (drawError) {
      const name = drawError.match(/<(\w+)>/)[1]
      results.push(detail('The order screen runs without errors', false, `React stopped drawing ${name} with an error, so the screen is empty. The details below for each part show the error, and so does the Browser panel's console.`, clean(drawError).slice(0, 240)))
    }
    results.push(
      detail(
        'The header count follows the basket',
        agree.every(Boolean) && lines() === 1,
        'The count in the header and the lines in the basket should agree after every click. Both come from the one basket in the store: the header reads its length with useStore, and the buttons call the store\'s actions.',
        trail.join('\n')
      )
    )

    // Each part alone, inside React's Profiler, while the check changes the store.
    const part = async (name, changes, read) => {
      const { page, problem } = await openHarness(t, 'screen-harness.jsx', SCREEN_FILES)
      if (problem) return { problem }
      if (typeof page.window.screen?.[name] !== 'function') {
        return { problem: detail(`OrderScreen.jsx exports ${name}`, false, `OrderScreen.jsx has no export called ${name}. Keep each part of the screen as its own exported component.`) }
      }
      const before = errorsOf(page).length
      page.window.showPart(name)
      await page.settle()
      const log = [`drawn alone: ${read(page)}, drawn ${page.window.commits} time(s)`]
      const draws = [page.window.commits]
      const seen = [read(page)]
      for (const [label, change] of changes) {
        if (errorsOf(page).length > before) break
        page.window.store.setState(change)
        await page.settle()
        log.push(`${label}: ${read(page)}, drawn ${page.window.commits} time(s)`)
        draws.push(page.window.commits)
        seen.push(read(page))
      }
      const error = own(stopped(page, before, `${name} runs without errors`))
      return { page, problem: error, draws: draws.join(', '), seen, output: log.join('\n') }
    }
    const props = (name) => `${name} drawn alone, with no props, showed what it was given rather than what the store holds. Read it from the store with useStore inside ${name}, instead of taking it as a prop.`

    const text = (selector) => (page) => clean(page.$(selector)?.textContent ?? '(nothing)')
    const header = await part('Header', [['paper set', { paper: 'kraft' }], ['note written', { note: 'Rush' }], ['more tags, still one line', { basket: [{ item: 'tag', quantity: 600 }] }], ['a line added', { basket: [{ item: 'tag', quantity: 400 }, { item: 'menu', quantity: 25 }] }]], text('.count'))
    if (header.problem) results.push(header.problem)
    else {
      results.push(
        detail(
          'The header is drawn only when the count changes',
          header.draws === '1, 1, 1, 1, 2' && header.seen[0] === 'Basket (1)' && header.seen.at(-1) === 'Basket (2)',
          header.seen[0] !== 'Basket (1)'
            ? props('Header')
            : header.draws.startsWith('1, 2')
              ? 'Header was drawn again when the paper changed, though it shows only the count. Pick only the count with useStore, not the whole state.'
              : header.draws.startsWith('1, 1, 1, 2')
                ? 'Header was drawn again when the basket became a new array with the same one line. Pick the count itself with useStore, not the basket: the count did not change.'
              : 'Header should show the store\'s count, and be drawn again once when a line is added.',
          `Header drawn alone, then the check changes the store\n${header.output}`
        )
      )
    }

    const basket = await part('Basket', [['paper set', { paper: 'kraft' }], ['note written', { note: 'Rush' }], ['menus added', { basket: [{ item: 'tag', quantity: 400 }, { item: 'menu', quantity: 25 }] }]], text('.basket ul'))
    if (basket.problem) results.push(basket.problem)
    else {
      results.push(
        detail(
          'The basket is drawn only when the basket changes',
          basket.draws === '1, 1, 1, 2' && basket.seen[0] === '400 x tagRemove' && basket.seen.at(-1) === '400 x tagRemove25 x menuRemove',
          basket.seen[0] !== '400 x tagRemove'
            ? props('Basket')
            : basket.draws.startsWith('1, 2')
              ? 'Basket was drawn again when the paper changed. Pick only the basket with useStore.'
              : 'Basket should show the store\'s lines, and be drawn again once when they change.',
          `Basket drawn alone, then the check changes the store\n${basket.output}`
        )
      )
    }

    const total = await part('Total', [['loading set', { loading: true }], ['prices set', { prices: { menu: 45, tag: 3 }, loading: false }], ['note written', { note: 'Rush' }]], text('.amount'))
    if (total.problem) results.push(total.problem)
    else {
      results.push(
        detail(
          'The total follows the store',
          total.seen[1] === 'Loading prices...' && total.seen[2] === '£12.00' && total.draws === '1, 2, 3, 3',
          total.seen[1] !== 'Loading prices...' || total.seen[2] !== '£12.00'
            ? 'Total drawn alone should show what the store holds: the loading line while loading is true, then the total of the store\'s basket at the store\'s prices. Read basket, prices, loading and error with useStore.'
            : 'Total was drawn again when only the note changed. Pick only what Total shows, with shallowEqual for a part made new each time, or one useStore for each value.',
          `Total drawn alone, then the check changes the store\n${total.output}`
        )
      )
    }

    // A field drawn alone: it shows the store's value, follows a change of the store, and a pick or
    // a keystroke on the page changes the store.
    const field = async (name, key, selector, change, picked, label) => {
      const run = await part(name, [[`${key} set to ${change}`, { [key]: change }]], (page) => page.$(selector)?.value ?? `(no ${selector})`)
      if (run.problem) return results.push(run.problem)
      const element = run.page.$(selector)
      if (element) await run.page.type(element, picked)
      const after = run.page.window.store.getState()[key]
      const start = run.seen[0]
      results.push(
        detail(
          label,
          run.seen.join('|') === `${START_FIELDS[key]}|${change}` && after === picked,
          start !== START_FIELDS[key]
            ? props(name)
            : run.seen[1] !== change
              ? `${name} should show the ${key} the store holds after it changes.`
              : `Changing the ${selector} on the page did not change the store's ${key}. Call the store's action from its onChange.`,
          `${name} drawn alone, then the check changes the store\n${run.output}\non the page, ${selector} changed to ${JSON.stringify(picked)}: the store's ${key} is ${JSON.stringify(after)}`
        )
      )
    }
    await field('PaperChoice', 'paper', 'select', 'cotton', 'kraft', 'The paper choice shows and changes the store\'s paper')
    await field('Note', 'note', 'textarea', 'Rush', 'Rush, ring the bell', 'The note shows and changes the store\'s note')
    return results
  }
}

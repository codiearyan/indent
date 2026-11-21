// The checks swap in their own src/routes.js (ids g-41 to g-46), so nothing tied to the
// learner's own data can pass.
const IDS = ['g-41', 'g-42', 'g-43', 'g-44', 'g-45', 'g-46']

async function open(t, data = 'grader/routes.js') {
  const dir = await t.sandbox({ 'src/routes.js': t.chapterPath(data) })
  return t.page('index.html', { dir })
}

const clean = (text) => (text ?? '').replace(/\s+/g, ' ').trim()
const itemOf = (page, id) => page.$(`#route-list li[data-id="${id}"]`)
const tickOf = (page, id) => itemOf(page, id)?.querySelector('.tick') ?? null
const pressed = (page, id) => tickOf(page, id)?.getAttribute('aria-pressed') ?? null

function states(page) {
  return IDS.map((id) => {
    const item = itemOf(page, id)
    if (!item) return `${id}: not on the board`
    return `${id}: aria-pressed=${pressed(page, id)} class="${item.className}"`
  }).join('\n')
}

function runs(page) {
  return {
    name: 'The page runs without errors',
    passed: page.errors.length === 0,
    message: 'The page threw an error. Open the console in the Browser panel and read the first one.',
    output: page.errors.join('\n')
  }
}

async function clickTick(page, id) {
  const button = tickOf(page, id)
  if (button) await page.click(button)
}

export const checks = {
  async 'tick-state'(t) {
    const page = await open(t)
    const startsOff = IDS.every((id) => pressed(page, id) === 'false')
    const before = states(page)
    await clickTick(page, 'g-43')
    const others = IDS.filter((id) => id !== 'g-43')
    return [
      runs(page),
      {
        name: 'Every route has a tick button that starts unpressed',
        passed: startsOff,
        message: 'Each route item needs a <button class="tick"> with aria-pressed="false" while the route is not ticked.',
        output: before
      },
      {
        name: 'A click presses the tick',
        passed: pressed(page, 'g-43') === 'true',
        message: 'After clicking the tick of a route, its button should have aria-pressed="true".',
        output: states(page)
      },
      {
        name: 'A ticked route carries the class ticked',
        passed:
          !!itemOf(page, 'g-43')?.classList.contains('ticked') &&
          others.every((id) => itemOf(page, id) && !itemOf(page, id).classList.contains('ticked')),
        message: 'The <li> of a ticked route should have the class ticked, and only that one.',
        output: states(page)
      },
      {
        name: 'Other routes stay unpressed',
        passed: others.every((id) => pressed(page, id) === 'false'),
        message: 'Clicking one tick should not change any other route.',
        output: states(page)
      }
    ]
  },

  async 'one-listener'(t) {
    const page = await open(t)
    await clickTick(page, 'g-41')
    await clickTick(page, 'g-44')
    await clickTick(page, 'g-41')
    const afterThree = states(page)
    const keepsWorking = pressed(page, 'g-41') === 'false' && pressed(page, 'g-44') === 'true'

    const fresh = await open(t)
    const original = itemOf(fresh, 'g-45')
    let lateWorks = false
    if (original) {
      // A copy made after the page loaded has no listeners of its own.
      const copy = original.cloneNode(true)
      original.remove()
      fresh.$('#route-list').append(copy)
      await clickTick(fresh, 'g-45')
      lateWorks = pressed(fresh, 'g-45') === 'true'
    }
    return [
      runs(page),
      {
        name: 'Ticks keep working after the first click',
        passed: keepsWorking,
        message: 'The check ticked one route, then another, then the first one again. Only the first click did anything. What happens to the buttons when the board draws itself again?',
        output: `after clicks on g-41, g-44, g-41:\n${afterThree}`
      },
      {
        name: 'A route added to the list later works too',
        passed: lateWorks,
        message: 'The check put a new copy of a route item into the list and clicked its tick. Nothing happened, so the click was handled by listeners on the old buttons. Listen once, on something that stays.',
        output: states(fresh)
      }
    ]
  },

  async 'tick-count'(t) {
    const page = await open(t)
    const count = () => (page.$('#tick-count') ? clean(page.$('#tick-count').textContent) : '(no #tick-count)')
    const start = count()
    await clickTick(page, 'g-42')
    const one = count()
    const none = await open(t, 'grader/no-routes.js')
    const empty = none.$('#tick-count') ? clean(none.$('#tick-count').textContent) : '(no #tick-count)'
    return [
      runs(page),
      {
        name: 'The count starts at zero of every route',
        passed: start === '0 of 6 ticked',
        message: 'With nothing ticked, #tick-count should read "0 of N ticked", where N is the number of routes.',
        output: `expected "0 of 6 ticked"\ngot      "${start}"`
      },
      {
        name: 'The count follows a tick',
        passed: one === '1 of 6 ticked',
        message: 'After one tick the count should go up by one. Is the count written again every time the board is drawn?',
        output: `expected "1 of 6 ticked"\ngot      "${one}"`
      },
      {
        name: 'An empty board counts zero of zero',
        passed: empty === '0 of 0 ticked',
        message: 'With no routes at all, the count should read "0 of 0 ticked".',
        output: `got "${empty}"`
      }
    ]
  }
}

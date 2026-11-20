// The checks swap in their own src/routes.js, so a board typed by hand or tied to the
// learner's own data cannot pass.
const HIDDEN = [
  { id: 'g-41', name: 'Quartz Ladder', grade: 'V1', colour: 'Green', setter: 'Noor' },
  { id: 'g-42', name: 'Pocket <Rocket>', grade: 'V4', colour: 'Blue', setter: 'Tobias' },
  { id: 'g-43', name: 'Overhang Eleven', grade: 'V10', colour: 'Black', setter: 'Maren' },
  { id: 'g-44', name: 'Soft Landing', grade: 'V2', colour: 'Pink', setter: 'Ilse' },
  { id: 'g-45', name: 'Sidepull Saga', grade: 'V6', colour: 'Purple', setter: 'Noor' },
  { id: 'g-46', name: 'Wide Side Story', grade: 'V5', colour: 'Orange', setter: 'Desmond' }
]
const BANDS = { V1: 'easy', V2: 'easy', V4: 'mid', V5: 'mid', V6: 'hard', V10: 'hard' }

async function open(t, data = 'grader/routes.js') {
  const dir = await t.sandbox({ 'src/routes.js': t.chapterPath(data) })
  return t.page('index.html', { dir })
}

const clean = (text) => (text ?? '').replace(/\s+/g, ' ').trim()
const items = (page) => page.$$('#route-list > li')
const nameOf = (item) => item.querySelector('.route-name')?.textContent ?? null
const isShown = (page, element) =>
  !!element && !element.closest('[hidden]') && page.style(element).display !== 'none'

function runs(page) {
  return {
    name: 'The page runs without errors',
    passed: page.errors.length === 0,
    message: 'The page threw an error. Open the console in the Browser panel and read the first one.',
    output: page.errors.join('\n')
  }
}

function boardOutput(page) {
  const found = items(page).map((item) => clean(item.textContent))
  return found.length ? found.join('\n') : '(the list is empty)'
}

export const checks = {
  async 'render-list'(t) {
    const page = await open(t)
    const list = items(page)
    const names = list.map(nameOf)
    const tagged = list.find((item) => item.dataset.id === 'g-42')
    const withMeta = list.filter((item, i) => {
      const route = HIDDEN[i]
      const text = item.textContent
      return route && text.includes(route.colour) && text.includes(route.setter)
    })
    return [
      runs(page),
      {
        name: 'One list item per route',
        passed: list.length === HIDDEN.length && list.every((item) => item.classList.contains('route')),
        message: `The check gave the page ${HIDDEN.length} routes of its own. #route-list should hold exactly one <li class="route"> for each, and nothing typed by hand.`,
        output: `${list.length} items found:\n${boardOutput(page)}`
      },
      {
        name: 'Names in the same order as the data',
        passed: JSON.stringify(names) === JSON.stringify(HIDDEN.map((r) => r.name)),
        message: 'Each item needs an element with the class route-name that holds the route name, in the order of the array.',
        output: `expected ${JSON.stringify(HIDDEN.map((r) => r.name))}\ngot      ${JSON.stringify(names)}`
      },
      {
        name: 'Each item carries its route id',
        passed: list.length > 0 && list.every((item, i) => item.dataset.id === HIDDEN[i]?.id),
        message: "Give every <li> a data-id attribute with the route's id. Later issues use it to know which route was clicked.",
        output: `got ${JSON.stringify(list.map((item) => item.dataset.id ?? null))}`
      },
      {
        name: 'A name with angle brackets shows as text',
        passed: !!tagged && nameOf(tagged) === 'Pocket <Rocket>',
        message: 'One route is called "Pocket <Rocket>". The page read part of it as HTML. Put names on the page as text, not as markup.',
        output: tagged ? `route-name shows: ${JSON.stringify(nameOf(tagged))}` : 'no item with data-id="g-42"'
      },
      {
        name: 'Colour and setter show on every route',
        passed: list.length === HIDDEN.length && withMeta.length === HIDDEN.length,
        message: 'Every item should also show the hold colour and the name of the setter.',
        output: boardOutput(page)
      }
    ]
  },

  async 'grade-badge'(t) {
    const page = await open(t)
    const list = items(page)
    const rows = HIDDEN.map((route) => {
      const item = list.find((li) => li.dataset.id === route.id)
      const badge = item?.querySelector('.grade')
      return { route, badge, text: clean(badge?.textContent), want: `grade-${BANDS[route.grade]}` }
    })
    const table = rows
      .map((r) => `${r.route.grade.padEnd(4)} badge: ${r.badge ? `"${r.text}" class="${r.badge.className}"` : 'none'}`)
      .join('\n')
    return [
      runs(page),
      {
        name: 'Every route has a grade badge',
        passed: rows.every((r) => r.badge && r.text === r.route.grade),
        message: 'Each route item needs an element with the class grade whose text is the grade, like V4.',
        output: table
      },
      {
        name: 'Badges carry their band',
        passed: rows.every((r) => r.badge?.classList.contains(r.want)),
        message: 'A badge also needs grade-easy for V0 to V2, grade-mid for V3 to V5 and grade-hard for V6 and up. Look at how you read the number out of a grade with two digits.',
        output: table
      }
    ]
  },

  async 'empty-state'(t) {
    const none = await open(t, 'grader/no-routes.js')
    const some = await open(t)
    const empty = none.$('#board-empty')
    return [
      runs(none),
      {
        name: 'No routes means an empty list',
        passed: items(none).length === 0,
        message: 'With an empty routes array the list should have no items at all, including any typed into the HTML.',
        output: boardOutput(none)
      },
      {
        name: 'No routes shows the empty line',
        passed: isShown(none, empty),
        message: 'With an empty routes array, #board-empty should be visible. It starts with the hidden attribute.',
        output: empty ? `#board-empty hidden: ${empty.hidden}` : 'no #board-empty on the page'
      },
      {
        name: 'Routes keep the empty line hidden',
        passed: !!some.$('#board-empty') && !isShown(some, some.$('#board-empty')) && items(some).length === HIDDEN.length,
        message: 'When there are routes, the board shows them and #board-empty stays hidden.',
        output: `${items(some).length} items, #board-empty hidden: ${some.$('#board-empty')?.hidden}`
      }
    ]
  }
}

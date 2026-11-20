// The checks swap in their own src/routes.js (6 routes, one called Quartz Ladder) and log
// routes the learner has never seen.
const COUNT = 6

// The kit's page.reloads misses jsdom 31's wording for an unprevented submit, so the checks
// also count submits that reach the window without defaultPrevented.
async function open(t) {
  const dir = await t.sandbox({ 'src/routes.js': t.chapterPath('grader/routes.js') })
  const page = await t.page('index.html', { dir })
  let leaves = 0
  page.window.addEventListener('submit', (event) => {
    if (!event.defaultPrevented) leaves++
  })
  page.leaves = () => Math.max(leaves, page.reloads)
  return page
}

const clean = (text) => (text ?? '').replace(/\s+/g, ' ').trim()
const isShown = (page, element) =>
  !!element && !element.closest('[hidden]') && page.style(element).display !== 'none'
const items = (page) => page.$$('#route-list > li')
const names = (page) => items(page).map((item) => item.querySelector('.route-name')?.textContent)
const errorLine = (page) => {
  const error = page.$('#form-error')
  return error ? `#form-error visible: ${isShown(page, error)}, text: "${clean(error.textContent)}"` : 'no #form-error'
}
const errorShown = (page) => isShown(page, page.$('#form-error')) && clean(page.$('#form-error').textContent) !== ''

async function log(page, { name, grade = 'V0', colour = 'Red', setter = 'Ruth' }) {
  await page.type('#route-name', name)
  await page.type('#route-grade', grade)
  await page.type('#route-colour', colour)
  await page.type('#route-setter', setter)
  await page.submit('#new-route')
}

function runs(page) {
  return {
    name: 'The page runs without errors',
    passed: page.errors.length === 0,
    message: 'The page threw an error. Open the console in the Browser panel and read the first one.',
    output: page.errors.join('\n')
  }
}

function stays(page) {
  return {
    name: 'The page does not reload',
    passed: page.leaves() === 0,
    message: 'Submitting the form made the browser leave the page. A submit listener has to stop that default action.',
    output: `the page tried to reload ${page.leaves()} time(s)`
  }
}

export const checks = {
  async 'handle-submit'(t) {
    const page = await open(t)
    await log(page, { name: 'Chalk Dust Fever', grade: 'V7', colour: 'Yellow', setter: 'Ruth' })
    const first = items(page)[0]
    const firstText = clean(first?.textContent)
    const tick = first?.querySelector('.tick')
    if (tick && first.querySelector('.route-name')?.textContent === 'Chalk Dust Fever') await page.click(tick)
    const added = items(page).find((item) => item.querySelector('.route-name')?.textContent === 'Chalk Dust Fever')
    return [
      runs(page),
      stays(page),
      {
        name: 'The new route goes on top of the board',
        passed: items(page).length === COUNT + 1 && names(page)[0] === 'Chalk Dust Fever',
        message: 'After a good submit, the board should have one more route, the new one first. Pass the values from the form to onAdd.',
        output: `${items(page).length} routes: ${names(page).join(', ')}`
      },
      {
        name: 'It shows the grade, colour and setter from the form',
        passed:
          clean(first?.querySelector('.grade')?.textContent) === 'V7' &&
          firstText.includes('Yellow') &&
          firstText.includes('Ruth'),
        message: 'The new route should carry the grade, colour and setter that were picked in the form. Read every field, not only the name.',
        output: `first route: ${firstText || '(none)'}`
      },
      {
        name: 'The new route can be ticked',
        passed:
          added?.querySelector('.tick')?.getAttribute('aria-pressed') === 'true' &&
          clean(page.$('#tick-count')?.textContent) === `1 of ${COUNT + 1} ticked`,
        message: 'Ticking the new route should work like any other, and the count should include it.',
        output: `count: "${clean(page.$('#tick-count')?.textContent)}"`
      }
    ]
  },

  async 'explain-problems'(t) {
    const page = await open(t)
    await log(page, { name: '   ', setter: 'Ruth' })
    const blank = { shown: errorShown(page), line: errorLine(page), count: items(page).length }
    await log(page, { name: 'quartz LADDER', setter: 'Ruth' })
    const taken = { shown: errorShown(page), line: errorLine(page), count: items(page).length }
    await log(page, { name: 'Heel Hook Hotel', setter: 'Ruth' })
    const fine = { shown: isShown(page, page.$('#form-error')), count: items(page).length }
    return [
      runs(page),
      stays(page),
      {
        name: 'A name of only spaces is refused',
        passed: blank.shown && blank.count === COUNT,
        message: 'A name made of spaces gets past the required attribute. Your code should catch it, show a message in #form-error and add nothing.',
        output: `${blank.line}, routes on the board: ${blank.count}`
      },
      {
        name: 'A name already on the board is refused',
        passed: taken.shown && taken.count === COUNT,
        message: 'The board already has a route with that name, written in other letter case. Show a message in #form-error and add nothing. isTaken can tell you.',
        output: `${taken.line}, routes on the board: ${taken.count}`
      },
      {
        name: 'A good route clears the message',
        passed: !fine.shown && fine.count === COUNT + 1,
        message: 'After a refused route, a good one should be added and #form-error should be hidden again.',
        output: `#form-error visible: ${fine.shown}, routes on the board: ${fine.count}`
      }
    ]
  },

  async 'ready-again'(t) {
    const page = await open(t)
    await log(page, { name: 'Quartz Ladder', setter: 'Ines' })
    const keptName = page.$('#route-name')?.value
    const keptSetter = page.$('#route-setter')?.value
    await log(page, { name: 'Crimp Lane', setter: 'Ines' })
    const name = page.$('#route-name')
    const focused = page.document.activeElement
    const focusedLabel = focused ? `<${focused.tagName.toLowerCase()}${focused.id ? ` id="${focused.id}"` : ''}>` : 'nothing'
    return [
      runs(page),
      {
        name: 'A refused route keeps what was typed',
        passed: keptName === 'Quartz Ladder' && keptSetter === 'Ines',
        message: 'When a route is refused, leave the fields as they were so the person can fix them.',
        output: `name: "${keptName}", setter: "${keptSetter}"`
      },
      {
        name: 'An added route empties the form',
        passed: names(page)[0] === 'Crimp Lane' && name?.value === '' && page.$('#route-setter')?.value === '',
        message: 'After a route is added, the name and setter fields should be empty again.',
        output: `first route: ${names(page)[0]}, name: "${name?.value}", setter: "${page.$('#route-setter')?.value}"`
      },
      {
        name: 'The cursor goes back to the name field',
        passed: names(page)[0] === 'Crimp Lane' && focused === name,
        message: 'After a route is added, the focus should be in #route-name, ready for the next one.',
        output: `focused: ${focusedLabel}`
      }
    ]
  }
}

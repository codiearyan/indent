import {
  WARNING,
  clean,
  detail,
  drawNew,
  explain,
  exportType,
  openComponent,
  press,
  shorten,
  warningsOf
} from '../../grading.mjs'

const pence = (n) => `£${(n / 100).toFixed(2)}`
const item = (id, name, pricePence) => ({ id, name, pricePence })
// Two of them cost the same, so only the id tells their lines apart.
const SHELF = [
  item('g-lamp', 'Lamp room tea towel', 650),
  item('g-badge', 'Tram club badge', 275),
  item('g-ruler', 'Ruler, depot plan', 275),
  item('g-bell', 'Brass bell', 1800)
]
const [LAMP, BADGE, RULER, BELL] = SHELF

async function tillPage(t) {
  const { page, problem } = await openComponent(t, 'src/Till.jsx')
  if (problem) return { problem }
  if (exportType(page, 'Till') !== 'function') {
    return {
      problem: detail('Till.jsx exports Till', false, 'Till.jsx has no export called Till any more. Keep the name and the export.')
    }
  }
  return { page }
}

const lines = (page) =>
  page.$$('#root .basket-list > li').map((li) => ({
    li,
    name: clean(li.querySelector('.name')?.textContent),
    qty: clean(li.querySelector('.qty')?.textContent).replace(/[^\d]/g, ''),
    price: clean(li.querySelector('.price')?.textContent)
  }))
const total = (page) => clean(page.$('#root .total')?.textContent)
const basketText = (page) =>
  lines(page)
    .map((line) => `${line.name || '(no name)'} x ${line.qty || '?'}`)
    .join(', ') || '(empty)'

/** The lines the basket should show, as [item, qty] pairs, against what it shows. */
function shows(page, want) {
  const got = lines(page)
  const sum = want.reduce((s, [it, qty]) => s + it.pricePence * qty, 0)
  return (
    got.length === want.length &&
    want.every(([it, qty], i) => got[i].name === it.name && got[i].qty === String(qty)) &&
    total(page) === `Total ${pence(sum)}`
  )
}

async function addItem(page, it) {
  const li = page.$$('#root .stock-list > li').find((row) => clean(row.querySelector('.name')?.textContent) === it.name)
  return press(page, li?.querySelector('button.add'))
}

async function removeLine(page, it) {
  const line = lines(page).find((l) => l.name === it.name)
  return press(page, line?.li.querySelector('button.remove'))
}

let shelf = []

/** Draws a new till with a fresh copy of the check's shelf; the error it stopped on, if any. */
function newTill(page) {
  shelf = SHELF.map((it) => ({ ...it }))
  const { errors } = drawNew(page, 'Till', { items: shelf })
  return errors[0] ?? null
}

/** One detail when the till changed the items it was given, which the screen alone does not show. */
function shelfChanged() {
  if (shelf.every((it, i) => JSON.stringify(it) === JSON.stringify(SHELF[i]))) return null
  return detail(
    'The items on the shelf stay as they were',
    false,
    'Adding changed the items the till was given: an item on the shelf is not as it was. A component changes nothing it is given. Make each basket line a new object, made from the item.',
    `shelf after adding:\n${shelf.map((it) => JSON.stringify(it)).join('\n')}`
  )
}

const DRAW_UPDATE = /while rendering a different component/

/** One detail when state was set while a component was being drawn, such as a handler called in the curly braces. */
function setWhileDrawing(page, logsBefore) {
  const lines = warningsOf(page.logs.slice(logsBefore), DRAW_UPDATE)
  if (!lines.length) return null
  return detail(
    'Nothing changes the basket while it is being drawn',
    false,
    'Something set state while a basket line was being drawn, and React warns about it in the console. A function was called in the curly braces instead of handed over, so it ran as soon as the line was drawn. Hand each event prop a function to call later.',
    shorten(lines[0])
  )
}

const isEvent = (value) => typeof value === 'object' && value !== null && ('target' in value || 'nativeEvent' in value)

const stopped = (error) => detail('The till runs without errors', false, explain(error), error)
const thrown = (page, before) => (page.errors.length > before ? page.errors[before] : null)

/** One detail when Add does not put a new line in the basket yet: tasks 3 and 4 build on it. */
async function addProblem(page) {
  const logsBefore = page.logs.length
  const error = newTill(page)
  if (error) return stopped(error)
  const before = page.errors.length
  await addItem(page, BADGE)
  await addItem(page, LAMP)
  if (thrown(page, before)) return stopped(thrown(page, before))
  const early = setWhileDrawing(page, logsBefore)
  if (early) return early
  if (shows(page, [[BADGE, 1], [LAMP, 1]])) return null
  return detail(
    'Add puts an item in the basket',
    false,
    'Adding two different items does not show them in the basket yet. That is the second task of this issue: do it first.',
    `added: ${BADGE.name}, ${LAMP.name}\nbasket: ${basketText(page)}`
  )
}

/** One detail when BasketLine, drawn on its own, does not call onRemove once with its line's id. */
async function lineCallsRemove(page) {
  if (exportType(page, 'BasketLine') !== 'function') {
    return detail('Till.jsx exports BasketLine', false, 'Till.jsx has no export called BasketLine any more. Keep the name and the export.')
  }
  const line = { id: 'g-flag', name: 'Station flag', pricePence: 300, qty: 2 }
  const got = []
  const { root, errors } = drawNew(page, 'BasketLine', { line, onRemove: (...args) => got.push(args) })
  if (errors.length) return stopped(errors[0])
  const drawing = got.length
  const button = root.querySelector('button.remove')
  const before = page.errors.length
  if (button) await press(page, button)
  if (thrown(page, before)) return stopped(thrown(page, before))
  const firsts = got.map((args) => args[0])
  if (button && !drawing && got.length === 1 && firsts[0] === line.id) return null
  let message = "Pressing Remove should call onRemove once, with the line's id."
  if (!button)
    message = 'BasketLine draws no button with the class remove yet. It draws one, and calls the function it is given when it is pressed.'
  else if (drawing)
    message = 'onRemove was called while the line was being drawn, before anyone pressed Remove. Hand the button a function to call later.'
  else if (firsts.some(isEvent))
    message = "onRemove was given the click's event, not the line's id. Call it with the id of the line from the props."
  else if (!got.length)
    message = 'Pressing Remove did not call onRemove. BasketLine calls the function it is given in its props.'
  const shown = (value) => (isEvent(value) ? 'the event' : value === undefined ? 'nothing' : JSON.stringify(value))
  return detail(
    "BasketLine calls onRemove with its line's id",
    false,
    message,
    `line: ${JSON.stringify(line)}\nonRemove calls: ${got.map((args) => `(${args.map(shown).join(', ')})`).join(' ') || '(none)'}`
  )
}

export const checks = {
  async options(t) {
    const { page, problem } = await tillPage(t)
    if (problem) return [problem]
    const error = newTill(page)
    if (error) return [stopped(error)]
    const pressed = (name) => page.$(`#root button.${name}`)?.getAttribute('aria-pressed') === 'true'
    const state = () => `Gift wrap ${pressed('wrap') ? 'on' : 'off'}, Paper bag ${pressed('bag') ? 'on' : 'off'}`
    const log = [`start: ${state()}`]
    const results = []
    const steps = [
      ['wrap', { wrap: true, bag: false }],
      ['bag', { wrap: true, bag: true }],
      ['wrap', { wrap: false, bag: true }],
      ['bag', { wrap: false, bag: false }]
    ]
    for (const [name, want] of steps) {
      const before = { wrap: pressed('wrap'), bag: pressed('bag') }
      if (!(await press(page, page.$(`#root button.${name}`)))) {
        return [detail(`The ${name} button is there`, false, `The button with the class ${name} is gone. Keep it.`)]
      }
      log.push(`pressed ${name === 'wrap' ? 'Gift wrap' : 'Paper bag'}: ${state()}`)
      const now = { wrap: pressed('wrap'), bag: pressed('bag') }
      const other = name === 'wrap' ? 'bag' : 'wrap'
      if (now.wrap === want.wrap && now.bag === want.bag) continue
      const label = name === 'wrap' ? 'Gift wrap' : 'Paper bag'
      let message = `Each button switches its own option on and off, and leaves the other as it was.`
      if (now[name] === before[name] && now[other] !== before[other])
        message = `Pressing ${label} switched ${other === 'wrap' ? 'Gift wrap' : 'Paper bag'} instead. Each button switches its own option.`
      else if (now[name] === before[name] && before[name])
        message = `Pressing ${label} again did not switch it off. Each press turns the option round, from on to off and back.`
      else if (now[name] === before[name])
        message = `Pressing ${name === 'wrap' ? 'Gift wrap' : 'Paper bag'} changed nothing on the screen. If the options object was changed in place, React was handed the same object and did not draw again: hand it a new one.`
      else if (now[other] !== before[other])
        message = `Pressing ${name === 'wrap' ? 'Gift wrap' : 'Paper bag'} also changed ${other === 'wrap' ? 'Gift wrap' : 'Paper bag'}. The new object has to keep every field it does not change.`
      results.push(detail('Each option switches on its own', false, message, log.join('\n')))
      return results
    }
    results.push(detail('Each option switches on and off on its own', true, '', log.join('\n')))
    return results
  },

  async add(t) {
    const { page, problem } = await tillPage(t)
    if (problem) return [problem]
    const results = []
    for (const order of [
      [BADGE, LAMP],
      [BELL, RULER, BADGE]
    ]) {
      const logsBefore = page.logs.length
      const error = newTill(page)
      if (error) return [stopped(error)]
      const before = page.errors.length
      const log = []
      for (const it of order) {
        await addItem(page, it)
        log.push(`added ${it.name}: ${basketText(page)}`)
      }
      if (thrown(page, before)) return [...results, stopped(thrown(page, before))]
      const early = setWhileDrawing(page, logsBefore) ?? shelfChanged()
      if (early) return [...results, early]
      const want = order.map((it) => [it, 1])
      const got = lines(page)
      let message = 'Each Add puts its item in the basket as a new line, in the order added, with a quantity of 1, and the total follows.'
      if (!got.length)
        message =
          'Pressing Add left the basket empty on the screen. The basket has to be state, and each Add hands React a new array: an array changed in place is the same array, so React does not draw again.'
      else if (got.length === 1 && order.length > 1)
        message = 'Only one line is in the basket after adding more than one item. Each new array keeps the lines already there.'
      else if (got.some((line) => line.qty && line.qty !== '1'))
        message = "Adding a new item raised the quantity of another line. Two of the check's items cost the same: tell a line by something only its item has."
      else if (got.some((line) => !line.name || !line.qty))
        message = 'The basket has lines, but some show no name or quantity. Draw each line with BasketLine, and give each new line the item and a quantity.'
      else if (shows(page, want.slice().reverse()) && order.length > 1)
        message = 'The lines are there, but the newest is first. Each new item goes at the end of the basket.'
      const unkeyed = warningsOf(page.logs.slice(logsBefore), WARNING.key)
      if (shows(page, want) && unkeyed.length) {
        results.push(
          detail(
            'Each basket line has a key',
            false,
            'The lines are right, but React warns that the lines of the basket have no key. Give each BasketLine a key that belongs to its line.',
            shorten(unkeyed[0])
          )
        )
        return results
      }
      results.push(
        detail(
          `Adding ${order.length} items puts ${order.length} lines in the basket`,
          shows(page, want),
          message,
          `${log.join('\n')}\nshown total: ${total(page) || '(none)'}`
        )
      )
      if (!results.at(-1).passed) return results
    }
    return results
  },

  async more(t) {
    const { page, problem } = await tillPage(t)
    if (problem) return [problem]
    const first = await addProblem(page)
    if (first) return [first]
    const error = newTill(page)
    if (error) return [stopped(error)]
    const logsBefore = page.logs.length
    const before = page.errors.length
    const log = []
    for (const it of [RULER, BELL, RULER, RULER]) {
      await addItem(page, it)
      log.push(`added ${it.name}: ${basketText(page)}`)
    }
    if (thrown(page, before)) return [stopped(thrown(page, before))]
    const changed = shelfChanged()
    if (changed) return [changed]
    const want = [
      [RULER, 3],
      [BELL, 1]
    ]
    const got = lines(page)
    const doubled = warningsOf(page.logs.slice(logsBefore), WARNING.sameKey)
    let message = 'Adding an item that is already in the basket raises the quantity of its line by one, keeps the line where it is, and the total follows.'
    if (got.length > 2)
      message = 'Adding an item twice gave it a second line. When the item is already in the basket, change its line instead.'
    else if (got.length === 2 && got.find((line) => line.name === RULER.name)?.qty === '1')
      message =
        "The quantity did not change on the screen. If the line was changed in place, React was handed the same basket and did not draw again. Hand it a new array, with a new line in the changed one's place."
    else if (got.length === 2 && got[1].name === RULER.name)
      message = 'The line moved to the end of the basket. A changed line stays in its place.'
    return [
      detail(
        'Adding the same item again raises its quantity',
        shows(page, want),
        message,
        `${log.join('\n')}\nshown total: ${total(page) || '(none)'}${doubled.length ? `\n${shorten(doubled[0])}` : ''}`
      )
    ]
  },

  async remove(t) {
    const { page, problem } = await tillPage(t)
    if (problem) return [problem]
    const first = await addProblem(page)
    if (first) return [first]
    const own = await lineCallsRemove(page)
    if (own) return [own]
    const error = newTill(page)
    if (error) return [stopped(error)]
    const before = page.errors.length
    for (const it of [LAMP, BADGE, RULER]) await addItem(page, it)
    for (const line of lines(page)) line.li.graderName = line.name
    if (!lines(page).some((line) => line.li.querySelector('button.remove'))) {
      return [
        detail(
          'Each line has a Remove button',
          false,
          'The basket lines have no button with the class remove yet. BasketLine draws it, and calls the function it is given when it is pressed.',
          `basket: ${basketText(page)}`
        )
      ]
    }
    const results = []
    await removeLine(page, LAMP)
    if (thrown(page, before)) return [stopped(thrown(page, before))]
    const afterFirst = lines(page)
    let message = 'Pressing Remove on the first line should take that line out and leave the others as they were.'
    if (afterFirst.length === 3)
      message =
        'Pressing Remove left the basket as it was on the screen. If the line was taken out in place, React was handed the same array and did not draw again. Hand it a new array without that line.'
    else if (afterFirst.some((line) => line.name === LAMP.name)) message = 'Remove took out a line, but not the one pressed.'
    results.push(
      detail(
        'Remove takes out the line it is on',
        shows(page, [
          [BADGE, 1],
          [RULER, 1]
        ]),
        message,
        `basket: ${LAMP.name} x 1, ${BADGE.name} x 1, ${RULER.name} x 1\nremoved ${LAMP.name}: ${basketText(page)}`
      )
    )
    if (!results[0].passed) return results

    const kept = afterFirst.every((line) => line.li.graderName === line.name)
    results.push(
      detail(
        'Each line keeps its own list item when a line leaves',
        kept,
        'When the first line left the basket, React reused the list items by their place: the element that held one line now holds another. Give each line a key that belongs to it, not its place in the list.',
        afterFirst.map((line) => `${line.name}: drawn in the element that held ${line.li.graderName ?? 'nothing before'}`).join('\n')
      )
    )
    if (!kept) return results

    await removeLine(page, RULER)
    await addItem(page, BELL)
    if (thrown(page, before)) return [...results, stopped(thrown(page, before))]
    results.push(
      detail(
        'The last line goes too, and adding works after',
        shows(page, [
          [BADGE, 1],
          [BELL, 1]
        ]),
        lines(page).length < 2
          ? "Remove took out more than the line pressed. Two of the check's items cost the same: pick the line by something only it has."
          : 'Remove takes out the line it is on wherever it is, and Add still puts new items at the end afterwards.',
        `removed ${RULER.name}, then added ${BELL.name}: ${basketText(page)}\nshown total: ${total(page) || '(none)'}`
      )
    )
    return results
  }
}

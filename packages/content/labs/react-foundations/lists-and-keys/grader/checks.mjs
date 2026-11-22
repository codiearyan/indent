import {
  WARNING,
  clean,
  detail,
  draw,
  explain,
  exportType,
  openComponent,
  shorten
} from '../../grading.mjs'

const FILE = 'src/ShopList.jsx'
const pence = (n) => `£${(n / 100).toFixed(2)}`
const item = (id, name, pricePence, stock) => ({ id, name, pricePence, stock })

// Cheapest first and all in stock, so tasks 3 and 4 change nothing about them.
const SHELF = [
  item('g-tea', 'Tea towel, depot map', 450, 9),
  item('g-bell', 'Brass bell keyring', 520, 15),
  item('g-cap', "Driver's cap", 1250, 2),
  item('g-kit', 'Model tram kit', 2400, 4)
]
// Same price and same stock: only something that belongs to each item tells them apart.
const TWINS = [item('t-14', 'Fridge magnet, tram 14', 250, 8), item('t-22', 'Fridge magnet, tram 22', 250, 8)]
const MIXED = [
  item('m-print', 'Poster, 1930 timetable', 800, 0),
  item('m-pen', 'Pencil with a tram', 120, 50),
  item('m-scarf', 'Scarf, Coalbrook green', 1800, 5),
  item('m-badge', 'Cloth badge', 300, 0),
  item('m-guide', 'Guide book', 650, 11),
  item('m-card', 'Postcard, the depot', 90, 1)
]
const SOLD_OUT = [item('s-a', 'Lantern slide', 700, 0), item('s-b', 'Old ticket punch', 2200, 0)]

/** Text drawn straight into the list, outside any list item: where a stray 0 ends up. */
const strayText = (root) =>
  [...(root.querySelector('ul.shop-list')?.childNodes ?? [])]
    .filter((node) => node.nodeType === 3 && node.nodeValue.trim())
    .map((node) => node.nodeValue.trim())

const rowsOf = (root) =>
  [...root.querySelectorAll('ul.shop-list > li')].map((li) => ({
    li,
    name: clean(li.querySelector('.name')?.textContent),
    price: clean(li.querySelector('.price')?.textContent)
  }))
const listed = (rows) => rows.map((row) => `${row.name || '(no name)'} ${row.price || '(no price)'}`).join('\n') || '(no items)'
const wanted = (items) => items.map((i) => `${i.name} ${pence(i.pricePence)}`).join('\n') || '(no items)'
// Order is task 4's, so here only which items appear counts.
const shows = (rows, items) => {
  const key = (name, price) => `${name} ${price}`
  const got = rows.map((row) => key(row.name, row.price)).sort()
  const want = items.map((i) => key(i.name, pence(i.pricePence))).sort()
  return JSON.stringify(got) === JSON.stringify(want)
}

async function listPage(t) {
  const { page, problem } = await openComponent(t, FILE)
  if (problem) return { problem }
  if (exportType(page, 'ShopList') !== 'function') {
    return {
      problem: detail(
        'ShopList.jsx exports ShopList',
        false,
        'ShopList.jsx has no export called ShopList any more. Keep the name and the export.'
      )
    }
  }
  return { page }
}

/** Draws the list with each set of items; returns what it showed, or the error it stopped on. */
function drawAll(page, sets) {
  const shown = []
  for (const items of sets) {
    const { root, errors, warnings } = draw(page, 'ShopList', { items })
    if (errors.length) return { error: errors[0] }
    shown.push({
      items,
      rows: rowsOf(root),
      stray: strayText(root),
      warnings,
      hasList: Boolean(root.querySelector('ul.shop-list'))
    })
  }
  return { shown }
}

const stopped = (error) => detail('The list draws without errors', false, explain(error), error)

/** Null when task 1 is right for items that are all in stock and in price order. */
function everyItemProblem(page) {
  const { shown, error } = drawAll(page, [SHELF, SHELF.slice(1, 2), []])
  if (error) return { error }
  const bad = shown.find((s) => !shows(s.rows, s.items))
  if (!bad) return null
  const many = shown[0]
  let message = 'The list did not show the items the check passed in. Draw one list item for each item in the items prop.'
  if (!many.hasList) message = 'There is no ul with the class shop-list any more. Keep it around the items.'
  else if (many.rows.length && many.rows.every((row) => row.name && !SHELF.some((i) => i.name === row.name)))
    message = 'The list still shows items typed in by hand. The check passed items of its own, and the list should come from the items prop.'
  else if (!many.rows.length)
    message =
      'The list is empty. map gives back what its callback returns: a callback in curly braces needs a return, and forEach gives back nothing at all.'
  else if (many.rows.some((row) => !row.price.startsWith('£')))
    message = "Each price is written the shop's way, with formatPence."
  return { message, output: `expected:\n${wanted(bad.items)}\nshown:\n${listed(bad.rows)}` }
}

const taskOneFirst = () =>
  detail('The list shows every item', false, 'Task 1 is not right yet: the list has to show the items it is given first.')

export const checks = {
  async 'every-item'(t) {
    const { page, problem } = await listPage(t)
    if (problem) return [problem]
    const wrong = everyItemProblem(page)
    if (wrong?.error) return [stopped(wrong.error)]
    return [
      detail(
        'One list item for each item, with its name and price',
        !wrong,
        wrong?.message,
        wrong?.output ?? `${SHELF.length} items, one item and no items all drawn`
      )
    ]
  },

  async keys(t) {
    const { page, problem } = await listPage(t)
    if (problem) return [problem]
    const first = drawAll(page, [SHELF])
    if (first.error) return [stopped(first.error)]
    if (everyItemProblem(page)) return [taskOneFirst()]

    const warnings = first.shown[0].warnings
    const missing = warnings.filter((line) => WARNING.key.test(line))
    const twice = warnings.filter((line) => WARNING.sameKey.test(line))
    const results = [
      detail(
        'React has no complaint about keys',
        !missing.length && !twice.length,
        twice.length
          ? 'React found two list items with the same key. A key has to be different for every item; pick something each item has that no other item shares.'
          : 'React warned that the list items have no key. The key goes on the element map gives back for each item.',
        [...missing, ...twice].map(shorten).join('\n')
      )
    ]
    if (!results[0].passed) return results

    // With keys that belong to the items, the item that moves up keeps its own element.
    draw(page, 'ShopList', { items: SHELF })
    for (const row of rowsOf(page.$('#root'))) row.li.graderName = row.name
    draw(page, 'ShopList', { items: SHELF.slice(1) })
    const after = rowsOf(page.$('#root'))
    const kept = after.every((row) => row.li.graderName === row.name)
    const allNew = after.every((row) => row.li.graderName === undefined)
    results.push(
      detail(
        'Each item keeps its own list item when the list changes',
        kept,
        allNew
          ? 'When the list was drawn again, React made a new list item for every item: the keys changed although the items did not. A key belongs to the item and stays the same every time.'
          : 'When the first item left the list, React reused the list items by their place: the element that held one item now holds another. A key should belong to the item itself, not to its place in the list.',
        after.map((row) => `${row.name}: drawn in the element that held ${row.li.graderName ?? 'nothing before'}`).join('\n')
      )
    )
    if (!kept) return results

    // Drawn last: two items with one key can leave the list in a state later draws trip over.
    const twins = draw(page, 'ShopList', { items: TWINS }).warnings.filter((line) => WARNING.sameKey.test(line))
    results.push(
      detail(
        'Two items that cost the same get keys of their own',
        !twins.length,
        'The check drew two items with the same price and the same stock, and React found two list items with the same key. Use something that belongs to each item and that no other item shares.',
        twins.map(shorten).join('\n') || TWINS.map((i) => i.name).join(', ')
      )
    )
    return results
  },

  async 'in-stock'(t) {
    const { page, problem } = await listPage(t)
    if (problem) return [problem]
    if (everyItemProblem(page)) return [taskOneFirst()]
    const { shown, error } = drawAll(page, [MIXED, SOLD_OUT])
    if (error) return [stopped(error)]
    const results = shown.map(({ items, rows, stray }) => {
      const want = items.filter((i) => i.stock > 0)
      const names = rows.map((row) => row.name)
      const passed = want.length === names.length && want.every((i) => names.includes(i.name)) && !stray.length
      let message = 'Some items that are in stock are missing. Only the items with a stock of 0 are left out.'
      if (names.some((name) => items.some((i) => i.name === name && i.stock === 0)))
        message = 'An item with a stock of 0 is still on the list. Leave those out before drawing.'
      else if (stray.length)
        message = `Something that is not a list item is drawn inside the list: ${stray.join(' ')}. Leave the sold-out items out before map, so it only gets the items to draw.`
      return detail(
        want.length ? 'Leaves out the items that are out of stock' : 'Shows nothing when everything is sold out',
        passed,
        message,
        `in stock: ${want.map((i) => i.name).join(', ') || '(none)'}\nshown: ${names.join(', ') || '(none)'}${stray.length ? `\ntext outside any list item: ${stray.join(' ')}` : ''}`
      )
    })
    return results
  },

  async 'cheapest-first'(t) {
    const { page, problem } = await listPage(t)
    if (problem) return [problem]
    if (everyItemProblem(page)) return [taskOneFirst()]
    const frozen = Object.freeze(MIXED.map((i) => Object.freeze({ ...i })))
    const { root, errors } = draw(page, 'ShopList', { items: frozen })
    if (errors.length) {
      return [
        detail(
          'Leaves the items prop as it was',
          false,
          /read only|not extensible|Cannot assign/.test(errors[0])
            ? 'ShopList tried to change the array it was given: sort changes an array in place. Props are read-only, so sort a copy.'
            : explain(errors[0]),
          errors[0]
        )
      ]
    }
    const rows = rowsOf(root)
    const prices = rows.map((row) => row.price)
    const order = rows.map((row) => MIXED.find((i) => i.name === row.name)?.pricePence ?? 0)
    const sorted = order.every((price, i) => i === 0 || order[i - 1] <= price)
    const reversed = order.every((price, i) => i === 0 || order[i - 1] >= price)
    return [
      detail('Leaves the items prop as it was', true),
      detail(
        'Shows the cheapest first',
        sorted && rows.length > 1,
        reversed
          ? 'The items are in order of price, but the most expensive comes first. Look at which way round your comparison is written.'
          : 'The items are not in order of price, cheapest first. Compare two items by their price in pence, as numbers.',
        `shown: ${rows.map((row) => `${row.name} ${row.price}`).join(', ') || '(none)'}\nprices in that order: ${prices.join(', ')}`
      )
    ]
  }
}

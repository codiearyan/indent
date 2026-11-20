export function gradeBand(grade) {
  const number = Number(grade.slice(1))
  if (number <= 2) return 'easy'
  if (number <= 5) return 'mid'
  return 'hard'
}

// Task: Show which routes are ticked
// The tick button and the item should show whether the route is in `ticked`.
function routeItem(route, isTicked) {
  const item = document.createElement('li')
  item.className = 'route'
  item.dataset.id = route.id

  const grade = document.createElement('span')
  grade.className = `grade grade-${gradeBand(route.grade)}`
  grade.textContent = route.grade

  const name = document.createElement('span')
  name.className = 'route-name'
  name.textContent = route.name

  const swatch = document.createElement('span')
  swatch.className = 'swatch'
  swatch.dataset.colour = route.colour

  const meta = document.createElement('span')
  meta.className = 'route-meta'
  meta.append(swatch, `${route.colour} holds, set by ${route.setter}`)

  const body = document.createElement('div')
  body.className = 'route-body'
  body.append(name, meta)

  const tick = document.createElement('button')
  tick.className = 'tick'
  tick.textContent = 'Tick'

  item.append(grade, body, tick)
  return item
}

export function renderBoard(list, routes, ticked) {
  list.replaceChildren(...routes.map((route) => routeItem(route, ticked.has(route.id))))
}

// Task: A count that stays right
// Write "N of M ticked" into `element`.
export function renderCount(element, routes, ticked) {}

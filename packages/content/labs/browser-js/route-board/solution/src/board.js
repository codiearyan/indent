export function gradeBand(grade) {
  const number = Number(grade.slice(1))
  if (number <= 2) return 'easy'
  if (number <= 5) return 'mid'
  return 'hard'
}

function routeItem(route) {
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

  item.append(grade, body)
  return item
}

export function renderBoard(list, routes) {
  list.replaceChildren(...routes.map(routeItem))
}

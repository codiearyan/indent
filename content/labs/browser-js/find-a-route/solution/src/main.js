import { routes } from './routes.js'
import { renderBoard, renderCount } from './board.js'
import { watchTicks } from './ticks.js'
import { matches } from './filter.js'

const list = document.querySelector('#route-list')
const search = document.querySelector('#search')
const gradeFilter = document.querySelector('#grade-filter')
const ticked = new Set()

function render() {
  const shown = routes.filter((route) => matches(route, search.value, gradeFilter.value))
  renderBoard(list, shown, ticked)
  document.querySelector('#board-empty').hidden = routes.length > 0
  document.querySelector('#no-match').hidden = routes.length === 0 || shown.length > 0
  renderCount(document.querySelector('#tick-count'), routes, ticked)
}

render()
search.addEventListener('input', render)
gradeFilter.addEventListener('change', render)
watchTicks(list, (id) => {
  if (ticked.has(id)) ticked.delete(id)
  else ticked.add(id)
  render()
})

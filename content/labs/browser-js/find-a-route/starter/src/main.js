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
  // Task: Say when nothing matches
  renderCount(document.querySelector('#tick-count'), routes, ticked)
}

render()
watchTicks(list, (id) => {
  if (ticked.has(id)) ticked.delete(id)
  else ticked.add(id)
  render()
})

import { routes } from './routes.js'
import { renderBoard, renderCount } from './board.js'
import { watchTicks } from './ticks.js'

const list = document.querySelector('#route-list')
const ticked = new Set()

function render() {
  renderBoard(list, routes, ticked)
  document.querySelector('#board-empty').hidden = routes.length > 0
  renderCount(document.querySelector('#tick-count'), routes, ticked)
}

render()
watchTicks(list, (id) => {
  if (ticked.has(id)) ticked.delete(id)
  else ticked.add(id)
  render()
})

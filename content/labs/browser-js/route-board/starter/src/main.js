import { routes } from './routes.js'
import { renderBoard } from './board.js'

const list = document.querySelector('#route-list')

renderBoard(list, routes)

// Task: An empty wall says so
// When there are no routes, show the <p id="board-empty"> line. Keep it hidden otherwise.

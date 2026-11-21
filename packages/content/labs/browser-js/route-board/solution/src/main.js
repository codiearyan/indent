import { routes } from './routes.js'
import { renderBoard } from './board.js'

const list = document.querySelector('#route-list')

renderBoard(list, routes)
document.querySelector('#board-empty').hidden = routes.length > 0

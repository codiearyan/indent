import { earlier, MAX_COMMENT } from './book.js'
import { Guestbook } from './Guestbook.jsx'

export function App() {
  return (
    <div className="screen">
      <h1>Coalbrook Tram Museum</h1>
      <Guestbook earlier={earlier} maxComment={MAX_COMMENT} />
    </div>
  )
}

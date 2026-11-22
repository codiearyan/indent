import { items } from './shop.js'
import { Till } from './Till.jsx'

export function App() {
  return (
    <div className="screen">
      <h1>Coalbrook Tram Museum</h1>
      <Till items={items} />
    </div>
  )
}

import { items } from './shop.js'
import { ShopList } from './ShopList.jsx'

export function App() {
  return (
    <div className="screen">
      <h1>Coalbrook Tram Museum</h1>
      <section className="shop">
        <h2>Gift shop</h2>
        <ShopList items={items} />
      </section>
    </div>
  )
}

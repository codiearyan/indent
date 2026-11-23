import { ShopPage } from './Shop.jsx'
import { MEMBER_DISCOUNT, shelves } from './shop.js'

export function App() {
  return (
    <div className="screen">
      <h1>Coalbrook Tram Museum</h1>
      <ShopPage shelves={shelves} memberDiscount={MEMBER_DISCOUNT} />
    </div>
  )
}

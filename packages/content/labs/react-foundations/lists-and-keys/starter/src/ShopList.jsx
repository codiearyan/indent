// Tasks, in order:
// 1. Draw one list item for each item in the items prop.
// 2. Give each list item a key that belongs to the item.
// 3. Leave out the items that are out of stock.
// 4. Put the cheapest first, without changing the items prop.
import { formatPence } from './money.js'

// This list was typed in by hand last month, and it ignores the items prop.
export function ShopList({ items }) {
  return (
    <ul className="shop-list">
      <li>
        <span className="name">Enamel pin, tram 14</span>
        <span className="price">£3.50</span>
      </li>
      <li>
        <span className="name">Network map, 1950</span>
        <span className="price">£6.00</span>
      </li>
      <li>
        <span className="name">Foundry Belle mug</span>
        <span className="price">£9.00</span>
      </li>
    </ul>
  )
}

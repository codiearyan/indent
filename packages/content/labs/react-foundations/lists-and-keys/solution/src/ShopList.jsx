// Tasks, in order:
// 1. Draw one list item for each item in the items prop.
// 2. Give each list item a key that belongs to the item.
// 3. Leave out the items that are out of stock.
// 4. Put the cheapest first, without changing the items prop.
import { formatPence } from './money.js'

export function ShopList({ items }) {
  const onSale = items.filter((item) => item.stock > 0).toSorted((a, b) => a.pricePence - b.pricePence)
  return (
    <ul className="shop-list">
      {onSale.map((item) => (
        <li key={item.id}>
          <span className="name">{item.name}</span>
          <span className="price">{formatPence(item.pricePence)}</span>
        </li>
      ))}
    </ul>
  )
}

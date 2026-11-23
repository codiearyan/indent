import { useState } from 'react'
import { discounted, formatPence } from './money.js'

// Tasks, in order:
// 1. Make DiscountContext in discount.js, with no discount by default.
// 2. Read the discount in Price from the context, not from a prop.
// 3. Provide the discount from ShopPage, and stop handing it down through Shelf and ShopItem.
// 4. Keep the shelves marked fullPrice at full price, even for members.

export function ShopPage({ shelves, memberDiscount }) {
  const [member, setMember] = useState(false)
  const discount = member ? memberDiscount : 0

  return (
    <div className="shop">
      <label className="member">
        <input type="checkbox" checked={member} onChange={(event) => setMember(event.target.checked)} />
        Member of the museum
      </label>
      {shelves.map((shelf) => (
        <Shelf key={shelf.id} shelf={shelf} discount={discount} />
      ))}
    </div>
  )
}

export function Shelf({ shelf, discount }) {
  return (
    <section className="shelf">
      <h2>{shelf.name}</h2>
      <ul className="shop-list">
        {shelf.items.map((item) => (
          <ShopItem key={item.id} item={item} discount={discount} />
        ))}
      </ul>
    </section>
  )
}

export function ShopItem({ item, discount }) {
  return (
    <li>
      <span className="name">{item.name}</span>
      <Price pence={item.pricePence} discount={discount} />
    </li>
  )
}

export function Price({ pence, discount }) {
  return <span className="price">{formatPence(discounted(pence, discount))}</span>
}

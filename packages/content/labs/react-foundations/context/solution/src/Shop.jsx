import { useContext, useState } from 'react'
import { DiscountContext } from './discount.js'
import { discounted, formatPence } from './money.js'

// Tasks, in order:
// 1. Make DiscountContext in discount.js, with no discount by default.
// 2. Read the discount in Price from the context, not from a prop.
// 3. Provide the discount from ShopPage, and stop handing it down through Shelf and ShopItem.
// 4. Keep the shelves marked fullPrice at full price, even for members.

export function ShopPage({ shelves, memberDiscount }) {
  const [member, setMember] = useState(false)

  return (
    <div className="shop">
      <label className="member">
        <input type="checkbox" checked={member} onChange={(event) => setMember(event.target.checked)} />
        Member of the museum
      </label>
      <DiscountContext value={member ? memberDiscount : 0}>
        {shelves.map((shelf) =>
          shelf.fullPrice ? (
            <DiscountContext key={shelf.id} value={0}>
              <Shelf shelf={shelf} />
            </DiscountContext>
          ) : (
            <Shelf key={shelf.id} shelf={shelf} />
          )
        )}
      </DiscountContext>
    </div>
  )
}

export function Shelf({ shelf }) {
  return (
    <section className="shelf">
      <h2>{shelf.name}</h2>
      <ul className="shop-list">
        {shelf.items.map((item) => (
          <ShopItem key={item.id} item={item} />
        ))}
      </ul>
    </section>
  )
}

export function ShopItem({ item }) {
  return (
    <li>
      <span className="name">{item.name}</span>
      <Price pence={item.pricePence} />
    </li>
  )
}

export function Price({ pence }) {
  const discount = useContext(DiscountContext)
  return <span className="price">{formatPence(discounted(pence, discount))}</span>
}

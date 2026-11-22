import { useState } from 'react'
import { formatPence } from './money.js'

// Tasks, in order:
// 1. Make Gift wrap and Paper bag switch on and off, each on its own.
// 2. Keep the basket in state, and put an item in it when Add is pressed.
// 3. Adding an item that is already in the basket raises its quantity.
// 4. Give each basket line a Remove button that takes it out.

export function Till({ items }) {
  const [options, setOptions] = useState({ wrap: false, bag: false })
  const [basket, setBasket] = useState([])

  function toggleWrap() {
    setOptions({ ...options, wrap: !options.wrap })
  }

  function toggleBag() {
    setOptions({ ...options, bag: !options.bag })
  }

  function add(item) {
    if (basket.some((line) => line.id === item.id)) {
      setBasket(basket.map((line) => (line.id === item.id ? { ...line, qty: line.qty + 1 } : line)))
    } else {
      setBasket([...basket, { ...item, qty: 1 }])
    }
  }

  function remove(id) {
    setBasket(basket.filter((line) => line.id !== id))
  }

  const total = basket.reduce((sum, line) => sum + line.pricePence * line.qty, 0)

  return (
    <div className="till">
      <section className="stock">
        <h2>On the shelf</h2>
        <ul className="stock-list">
          {items.map((item) => (
            <li key={item.id}>
              <span className="name">{item.name}</span>
              <span className="price">{formatPence(item.pricePence)}</span>
              <button className="add" onClick={() => add(item)}>
                Add
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="basket">
        <h2>Basket</h2>
        <ul className="basket-list">
          {basket.map((line) => (
            <BasketLine key={line.id} line={line} onRemove={remove} />
          ))}
        </ul>
        <p className="total">Total {formatPence(total)}</p>
        <div className="options">
          <button className="wrap" aria-pressed={options.wrap} onClick={toggleWrap}>
            Gift wrap
          </button>
          <button className="bag" aria-pressed={options.bag} onClick={toggleBag}>
            Paper bag
          </button>
        </div>
      </section>
    </div>
  )
}

export function BasketLine({ line, onRemove }) {
  return (
    <li>
      <span className="name">{line.name}</span>
      <span className="qty">× {line.qty}</span>
      <span className="price">{formatPence(line.pricePence * line.qty)}</span>
      <button className="remove" onClick={() => onRemove(line.id)}>
        Remove
      </button>
    </li>
  )
}

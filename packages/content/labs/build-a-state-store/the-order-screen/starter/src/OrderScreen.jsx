// Sefton's order screen. OrderScreen keeps the order in five pieces of state of its own and hands
// them down as props, so every change draws the whole screen, and the count is kept by hand.
//
// Task 3: Put the order screen on the store (Header, Basket, PaperChoice, Note, Total, OrderScreen)
// Each part reads what it shows with useStore, and changes the order with orderStore.actions.
import { useEffect, useState } from 'react'
import { ITEMS, OPEN_ORDER, PAPERS, pounds, totalOf } from './order.js'
import { fetchPrices } from './price-list.js'

export function Header({ count }) {
  return (
    <header className="header">
      <h1>Ashgrove Press</h1>
      <p className="count">Basket ({count})</p>
    </header>
  )
}

export function Catalog({ onAdd }) {
  return (
    <section className="catalog">
      <h2>Add to the order</h2>
      <ul>
        {ITEMS.map(({ item, label, step }) => (
          <li key={item}>
            <span>{label}</span>
            <button type="button" data-item={item} onClick={() => onAdd(item, step)}>
              Add {step}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Basket({ basket, onRemove }) {
  return (
    <section className="basket">
      <h2>Basket</h2>
      {basket.length === 0 ? (
        <p>The basket is empty.</p>
      ) : (
        <ul>
          {basket.map((line) => (
            <li key={line.item}>
              <span>
                {line.quantity} x {line.item}
              </span>
              <button type="button" data-item={line.item} onClick={() => onRemove(line.item)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function PaperChoice({ paper, onChange }) {
  return (
    <section className="paper">
      <label>
        Paper{' '}
        <select value={paper} onChange={(event) => onChange(event.target.value)}>
          {PAPERS.map((kind) => (
            <option key={kind}>{kind}</option>
          ))}
        </select>
      </label>
    </section>
  )
}

export function Note({ note, onChange }) {
  return (
    <section className="note">
      <label>
        Note for the press
        <textarea value={note} onChange={(event) => onChange(event.target.value)} />
      </label>
    </section>
  )
}

export function Total({ basket, prices, loading }) {
  let text = 'No prices yet'
  if (loading) text = 'Loading prices...'
  else if (prices) text = pounds(totalOf(basket, prices))
  return (
    <section className="total">
      <h2>Total</h2>
      <p className="amount">{text}</p>
    </section>
  )
}

export function OrderScreen() {
  const [basket, setBasket] = useState(OPEN_ORDER.basket)
  const [count, setCount] = useState(OPEN_ORDER.basket.length)
  const [paper, setPaper] = useState(OPEN_ORDER.paper)
  const [note, setNote] = useState(OPEN_ORDER.note)
  const [prices, setPrices] = useState(null)

  useEffect(() => {
    fetchPrices().then(setPrices)
  }, [])

  function add(item, quantity) {
    const found = basket.some((line) => line.item === item)
    setBasket(
      found
        ? basket.map((line) => (line.item === item ? { ...line, quantity: line.quantity + quantity } : line))
        : [...basket, { item, quantity }]
    )
    setCount(count + 1)
  }

  function remove(item) {
    setBasket(basket.filter((line) => line.item !== item))
  }

  return (
    <main className="order">
      <Header count={count} />
      <div className="columns">
        <Catalog onAdd={add} />
        <Basket basket={basket} onRemove={remove} />
      </div>
      <PaperChoice paper={paper} onChange={setPaper} />
      <Note note={note} onChange={setNote} />
      <Total basket={basket} prices={prices} loading={prices === null} />
    </main>
  )
}

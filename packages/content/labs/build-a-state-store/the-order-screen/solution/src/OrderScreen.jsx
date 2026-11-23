// The order screen, on the order store. Each part reads only what it shows, with useStore, and
// changes the order through the store's actions.
//
// Task 3: Put the order screen on the store (Header, Basket, PaperChoice, Note, Total, OrderScreen)
import { useEffect } from 'react'
import { ITEMS, PAPERS, pounds, totalOf } from './order.js'
import { orderStore } from './order-store.js'
import { shallowEqual } from './store.js'
import { useStore } from './use-store.js'

const { add, remove, choosePaper, writeNote, loadPrices } = orderStore.actions

export function Header() {
  const count = useStore((state) => state.basket.length)
  return (
    <header className="header">
      <h1>Ashgrove Press</h1>
      <p className="count">Basket ({count})</p>
    </header>
  )
}

export function Catalog() {
  return (
    <section className="catalog">
      <h2>Add to the order</h2>
      <ul>
        {ITEMS.map(({ item, label, step }) => (
          <li key={item}>
            <span>{label}</span>
            <button type="button" data-item={item} onClick={() => add(item, step)}>
              Add {step}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Basket() {
  const basket = useStore((state) => state.basket)
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
              <button type="button" data-item={line.item} onClick={() => remove(line.item)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function PaperChoice() {
  const paper = useStore((state) => state.paper)
  return (
    <section className="paper">
      <label>
        Paper{' '}
        <select value={paper} onChange={(event) => choosePaper(event.target.value)}>
          {PAPERS.map((kind) => (
            <option key={kind}>{kind}</option>
          ))}
        </select>
      </label>
    </section>
  )
}

export function Note() {
  const note = useStore((state) => state.note)
  return (
    <section className="note">
      <label>
        Note for the press
        <textarea value={note} onChange={(event) => writeNote(event.target.value)} />
      </label>
    </section>
  )
}

export function Total() {
  const { basket, prices, loading, error } = useStore(
    (state) => ({ basket: state.basket, prices: state.prices, loading: state.loading, error: state.error }),
    shallowEqual
  )
  let text = 'No prices yet'
  if (loading) text = 'Loading prices...'
  else if (error) text = error
  else if (prices) text = pounds(totalOf(basket, prices))
  return (
    <section className="total">
      <h2>Total</h2>
      <p className="amount">{text}</p>
    </section>
  )
}

export function OrderScreen() {
  useEffect(() => {
    loadPrices()
  }, [])
  return (
    <main className="order">
      <Header />
      <div className="columns">
        <Catalog />
        <Basket />
      </div>
      <PaperChoice />
      <Note />
      <Total />
    </main>
  )
}

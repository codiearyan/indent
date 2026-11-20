import { useState } from 'react'
import { HoldShelf } from './HoldShelf.jsx'
import { StockList } from './StockList.jsx'
import { stock } from './stock.js'

export function App() {
  const [heldIds, setHeldIds] = useState([])

  function toggleHold(id) {
    setHeldIds((ids) => (ids.includes(id) ? ids.filter((held) => held !== id) : [...ids, id]))
  }

  const heldRecords = stock.filter((record) => heldIds.includes(record.id))

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <h1 className="brand">Sidewinder Records</h1>
          <p className="brand-sub">Counter screen</p>
        </div>
        <span className="hold-count">{heldIds.length} on hold</span>
      </header>

      <main className="layout">
        <section aria-label="Stock">
          <h2 className="section-title">In stock</h2>
          <StockList records={stock} heldIds={heldIds} onToggleHold={toggleHold} />
        </section>

        <HoldShelf records={heldRecords} />
      </main>
    </div>
  )
}

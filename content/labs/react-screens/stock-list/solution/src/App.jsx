import { StockList } from './StockList.jsx'
import { stock } from './stock.js'

export function App() {
  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <h1 className="brand">Sidewinder Records</h1>
          <p className="brand-sub">Counter screen</p>
        </div>
        <span className="hold-count">0 on hold</span>
      </header>

      <main className="layout">
        <section aria-label="Stock">
          <h2 className="section-title">In stock</h2>
          <StockList records={stock} />
        </section>

        <aside className="hold-shelf" aria-label="Hold shelf">
          <h2>Hold shelf</h2>
          <p className="shelf-empty">Nothing on hold yet.</p>
        </aside>
      </main>
    </div>
  )
}

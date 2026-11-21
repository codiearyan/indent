import { formatPrice } from './format.js'

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
          <ul className="stock-list">
            <li>
              <article className="record-card">
                <div className="sleeve" style={{ background: '#2f5d62' }} />
                <span className="sold-mark">Sold</span>
                <h3>Low Tide Sessions</h3>
                <p className="artist">Marisol Quint Trio</p>
                <p className="meta">1971 · Jazz · Very good</p>
                <div className="card-foot">
                  <span className="price">{formatPrice(32)}</span>
                  <button type="button" className="hold-button">
                    Hold
                  </button>
                </div>
              </article>
            </li>
            <li>
              <article className="record-card">
                <div className="sleeve" style={{ background: '#b5523b' }} />
                <span className="sold-mark">Sold</span>
                <h3>Paper Moon Engine</h3>
                <p className="artist">The Driftwood Collective</p>
                <p className="meta">1978 · Rock · Good</p>
                <div className="card-foot">
                  <span className="price">{formatPrice(18)}</span>
                  <button type="button" className="hold-button">
                    Hold
                  </button>
                </div>
              </article>
            </li>
            <li>
              <article className="record-card">
                <div className="sleeve" style={{ background: '#8a6f3e' }} />
                <span className="sold-mark">Sold</span>
                <h3>Copper Wire Blues</h3>
                <p className="artist">Otis Fenwick</p>
                <p className="meta">1966 · Blues · Fair</p>
                <div className="card-foot">
                  <span className="price">{formatPrice(14)}</span>
                  <button type="button" className="hold-button">
                    Hold
                  </button>
                </div>
              </article>
            </li>
          </ul>
        </section>

        <aside className="hold-shelf" aria-label="Hold shelf">
          <h2>Hold shelf</h2>
          <p className="shelf-empty">Nothing on hold yet.</p>
        </aside>
      </main>
    </div>
  )
}

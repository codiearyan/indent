import { useState } from 'react'
import { HoldShelf } from './HoldShelf.jsx'
import { StockList } from './StockList.jsx'
import { Toolbar } from './Toolbar.jsx'
import { stock } from './stock.js'

export function App() {
  const [heldIds, setHeldIds] = useState([])
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('all')

  function toggleHold(id) {
    setHeldIds((ids) => (ids.includes(id) ? ids.filter((held) => held !== id) : [...ids, id]))
  }

  function clear() {
    setQuery('')
    setGenre('all')
  }

  const genres = [...new Set(stock.map((record) => record.genre))].sort()
  const needle = query.trim().toLowerCase()
  const visible = stock.filter(
    (record) =>
      (genre === 'all' || record.genre === genre) &&
      (record.title.toLowerCase().includes(needle) || record.artist.toLowerCase().includes(needle))
  )
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
          <Toolbar
            query={query}
            onQueryChange={setQuery}
            genre={genre}
            onGenreChange={setGenre}
            genres={genres}
            onClear={clear}
          />
          <p className="result-count">
            Showing {visible.length} of {stock.length} records
          </p>
          {visible.length === 0 ? (
            <p className="empty-line">No records match.</p>
          ) : (
            <StockList records={visible} heldIds={heldIds} onToggleHold={toggleHold} />
          )}
        </section>

        <HoldShelf records={heldRecords} />
      </main>
    </div>
  )
}

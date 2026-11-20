import { useEffect, useState } from 'react'
import { DetailsPanel } from './DetailsPanel.jsx'
import { HoldShelf } from './HoldShelf.jsx'
import { StockList } from './StockList.jsx'
import { Toolbar } from './Toolbar.jsx'
import { stock } from './stock.js'

const SHELF_KEY = 'sidewinder.hold'

function readShelf() {
  try {
    const saved = JSON.parse(localStorage.getItem(SHELF_KEY))
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

export function App() {
  const [heldIds, setHeldIds] = useState(readShelf)
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('all')
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    localStorage.setItem(SHELF_KEY, JSON.stringify(heldIds))
  }, [heldIds])

  useEffect(() => {
    if (openId === null) return
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpenId(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [openId])

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
  const openRecord = stock.find((record) => record.id === openId)

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
            <StockList
              records={visible}
              heldIds={heldIds}
              onToggleHold={toggleHold}
              onOpen={setOpenId}
            />
          )}
        </section>

        <HoldShelf records={heldRecords} />
      </main>

      {openRecord && <DetailsPanel record={openRecord} onClose={() => setOpenId(null)} />}
    </div>
  )
}

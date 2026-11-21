export function HoldShelf({ records }) {
  return (
    <aside className="hold-shelf" aria-label="Hold shelf">
      <h2>Hold shelf</h2>
      {records.length === 0 ? (
        <p className="shelf-empty">Nothing on hold yet.</p>
      ) : (
        <ul>
          {records.map((record) => (
            <li key={record.id}>
              <span>{record.title}</span>
              <span className="shelf-artist">{record.artist}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

import { formatPrice } from './format.js'

export function RecordCard({ record, held, onToggleHold }) {
  return (
    <article className="record-card">
      <div className="sleeve" style={{ background: record.sleeve }} />
      {record.sold && <span className="sold-mark">Sold</span>}
      <h3>{record.title}</h3>
      <p className="artist">{record.artist}</p>
      <p className="meta">
        {record.year} · {record.genre} · {record.condition}
      </p>
      <div className="card-foot">
        <span className="price">{formatPrice(record.price)}</span>
        <button
          type="button"
          className={held ? 'hold-button is-held' : 'hold-button'}
          onClick={onToggleHold}
        >
          {held ? 'Release' : 'Hold'}
        </button>
      </div>
    </article>
  )
}

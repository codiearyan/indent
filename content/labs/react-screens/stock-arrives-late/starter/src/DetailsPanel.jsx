import { formatPrice } from './format.js'

export function DetailsPanel({ record, onClose }) {
  return (
    <aside className="details-panel" role="dialog" aria-label="Record details">
      <div className="panel-head">
        <h2>{record.title}</h2>
        <button type="button" className="close-button" onClick={onClose}>
          Close
        </button>
      </div>
      <dl>
        <dt>Artist</dt>
        <dd>{record.artist}</dd>
        <dt>Year</dt>
        <dd>{record.year}</dd>
        <dt>Genre</dt>
        <dd>{record.genre}</dd>
        <dt>Condition</dt>
        <dd>{record.condition}</dd>
        <dt>Price</dt>
        <dd>{formatPrice(record.price)}</dd>
      </dl>
    </aside>
  )
}

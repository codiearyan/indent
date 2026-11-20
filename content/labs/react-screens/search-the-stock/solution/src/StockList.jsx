import { RecordCard } from './RecordCard.jsx'

export function StockList({ records, heldIds, onToggleHold }) {
  return (
    <ul className="stock-list">
      {records.map((record) => (
        <li key={record.id}>
          <RecordCard
            record={record}
            held={heldIds.includes(record.id)}
            onToggleHold={() => onToggleHold(record.id)}
          />
        </li>
      ))}
    </ul>
  )
}

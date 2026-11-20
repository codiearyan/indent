import { RecordCard } from './RecordCard.jsx'

export function StockList({ records, heldIds, onToggleHold, onOpen }) {
  return (
    <ul className="stock-list">
      {records.map((record) => (
        <li key={record.id}>
          <RecordCard
            record={record}
            held={heldIds.includes(record.id)}
            onToggleHold={() => onToggleHold(record.id)}
            onOpen={() => onOpen(record.id)}
          />
        </li>
      ))}
    </ul>
  )
}

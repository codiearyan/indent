import { RecordCard } from './RecordCard.jsx'

export function StockList({ records }) {
  return (
    <ul className="stock-list">
      {records.map((record) => (
        <li key={record.id}>
          <RecordCard record={record} />
        </li>
      ))}
    </ul>
  )
}

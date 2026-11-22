const DAYS = [
  ['all', 'All'],
  ['mon', 'Mon'],
  ['tue', 'Tue'],
  ['wed', 'Wed'],
  ['thu', 'Thu'],
  ['fri', 'Fri'],
  ['sat', 'Sat'],
  ['sun', 'Sun']
]

// Calls onChange with 'all' or the short name of a day, the way the API writes days.
export function DayPicker({ day, onChange }) {
  return (
    <div className="days" role="group" aria-label="Day">
      {DAYS.map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={day === value}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

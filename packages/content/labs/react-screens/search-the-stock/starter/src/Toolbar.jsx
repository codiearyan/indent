export function Toolbar() {
  return (
    <div className="toolbar">
      <input id="search" type="search" placeholder="Title or artist" aria-label="Search the stock" />
      <select id="genre" aria-label="Genre">
        <option value="all">All genres</option>
      </select>
      <button type="button" className="clear-button">
        Clear
      </button>
    </div>
  )
}

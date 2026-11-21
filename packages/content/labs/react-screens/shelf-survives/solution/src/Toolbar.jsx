export function Toolbar({ query, onQueryChange, genre, onGenreChange, genres, onClear }) {
  return (
    <div className="toolbar">
      <input
        id="search"
        type="search"
        placeholder="Title or artist"
        aria-label="Search the stock"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <select
        id="genre"
        aria-label="Genre"
        value={genre}
        onChange={(event) => onGenreChange(event.target.value)}
      >
        <option value="all">All genres</option>
        {genres.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <button type="button" className="clear-button" onClick={onClear}>
        Clear
      </button>
    </div>
  )
}

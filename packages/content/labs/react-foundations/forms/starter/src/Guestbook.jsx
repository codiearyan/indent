import { useState } from 'react'

// Tasks, in order:
// 1. Keep the name field's value in state, and show it in the preview.
// 2. Do the same for where the visitor is from and their comment.
// 3. Sign the book: add the entry at the top, without a reload, and empty the form.
// 4. Show what is wrong before the book is signed.

export function Guestbook({ earlier, maxComment }) {
  const [entries, setEntries] = useState(earlier)

  return (
    <section className="book">
      <h2>Visitor book</h2>
      <form>
        <label>
          Your name
          <input name="name" />
        </label>
        <label>
          Where you are from
          <input name="from" />
        </label>
        <label>
          Your comment
          <textarea name="comment" rows="3" />
        </label>
        <button className="sign" type="submit">
          Sign the book
        </button>
      </form>
      <div className="preview">
        <p>
          <span className="name"></span>, <span className="from"></span>
        </p>
        <p className="comment"></p>
      </div>
      <ul className="entries">
        {entries.map((entry) => (
          <li key={entry.id}>
            <p>
              <span className="name">{entry.name}</span>, <span className="from">{entry.from}</span>
            </p>
            <p className="comment">{entry.comment}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

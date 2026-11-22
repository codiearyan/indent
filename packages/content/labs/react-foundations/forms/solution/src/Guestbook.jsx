import { useState } from 'react'

// Tasks, in order:
// 1. Keep the name field's value in state, and show it in the preview.
// 2. Do the same for where the visitor is from and their comment.
// 3. Sign the book: add the entry at the top, without a reload, and empty the form.
// 4. Show what is wrong before the book is signed.

const EMPTY = { name: '', from: '', comment: '' }

export function Guestbook({ earlier, maxComment }) {
  const [entries, setEntries] = useState(earlier)
  const [form, setForm] = useState(EMPTY)

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const tooMany = form.comment.length - maxComment
  const canSign = form.name.trim() !== '' && tooMany <= 0

  function sign(event) {
    event.preventDefault()
    if (!canSign) return
    setEntries([{ id: crypto.randomUUID(), ...form }, ...entries])
    setForm(EMPTY)
  }

  return (
    <section className="book">
      <h2>Visitor book</h2>
      <form onSubmit={sign}>
        <label>
          Your name
          <input name="name" value={form.name} onChange={change} />
        </label>
        <label>
          Where you are from
          <input name="from" value={form.from} onChange={change} />
        </label>
        <label>
          Your comment
          <textarea name="comment" rows="3" value={form.comment} onChange={change} />
        </label>
        {tooMany > 0 && (
          <p className="problem">
            {tooMany} {tooMany === 1 ? 'character' : 'characters'} too many
          </p>
        )}
        <button className="sign" type="submit" disabled={!canSign}>
          Sign the book
        </button>
      </form>
      <div className="preview">
        <p>
          <span className="name">{form.name}</span> <span className="from">{form.from}</span>
        </p>
        <p className="comment">{form.comment}</p>
      </div>
      <ul className="entries">
        {entries.map((entry) => (
          <li key={entry.id}>
            <p>
              <span className="name">{entry.name}</span> <span className="from">{entry.from}</span>
            </p>
            <p className="comment">{entry.comment}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

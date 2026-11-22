import { answers, tickets } from './choices.js'

// Tasks, in order:
// 1. Ring the desk bell when Ring for help is pressed.
// 2. Print the right ticket when a ticket button is pressed.
// 3. Tell the desk which answer a visitor picks.
// 4. Write TicketButton, and use it for the ticket buttons.

export function Kiosk() {
  return (
    <div className="kiosk">
      <section className="help">
        <h2>Need a hand?</h2>
        <button className="ring">Ring for help</button>
      </section>
      <section className="tickets">
        <h2>Buy a ticket</h2>
        <div className="ticket-buttons">
          {tickets.map((kind) => (
            <button key={kind} className="ticket">
              {kind}
            </button>
          ))}
        </div>
      </section>
      <section className="heard">
        <h2>How did you hear about us?</h2>
        <select className="answer">
          <option value="">Pick one</option>
          {answers.map((answer) => (
            <option key={answer} value={answer}>
              {answer}
            </option>
          ))}
        </select>
      </section>
    </div>
  )
}

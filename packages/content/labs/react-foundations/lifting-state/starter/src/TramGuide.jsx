import { useState } from 'react'

// Tasks, in order:
// 1. Keep the chosen tram in TramGuide, and hand it down to TramList and TramPanel.
// 2. Choose a tram from the list: TramList calls onChoose.
// 3. Next tram from the panel: TramPanel calls onNext, and TramGuide moves on.

export function TramList({ trams }) {
  const [chosen, setChosen] = useState(trams[0].number)

  return (
    <ul className="tram-list">
      {trams.map((tram) => (
        <li key={tram.number}>
          <button aria-pressed={tram.number === chosen} onClick={() => setChosen(tram.number)}>
            <span className="number">{tram.number}</span> {tram.name}
          </button>
        </li>
      ))}
    </ul>
  )
}

export function TramPanel({ trams }) {
  const [chosen, setChosen] = useState(trams[0].number)
  const tram = trams.find((t) => t.number === chosen)

  function next() {
    const at = trams.indexOf(tram)
    setChosen(trams[(at + 1) % trams.length].number)
  }

  return (
    <section className="tram-panel">
      <h2>{tram.name}</h2>
      <p className="built">
        Tram {tram.number}, built in {tram.built}
      </p>
      <p className="story">{tram.story}</p>
      <button className="next" onClick={next}>
        Next tram
      </button>
    </section>
  )
}

export function TramGuide({ trams }) {
  return (
    <div className="guide">
      <TramList trams={trams} />
      <TramPanel trams={trams} />
    </div>
  )
}

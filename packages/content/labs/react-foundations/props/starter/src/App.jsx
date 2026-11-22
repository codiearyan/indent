import { trams } from './trams.js'
import { TramCard } from './TramCard.jsx'

// Each card below was copied from the one before and edited by hand.
export function App() {
  return (
    <div className="screen">
      <h1>Coalbrook Tram Museum</h1>
      <h2>In the shed today</h2>
      <div className="trams">
        <article className="tram-card">
          <h3>The Kettleby Car</h3>
          <p className="number">No. 7</p>
          <p className="built">Built in 1904</p>
        </article>
        <article className="tram-card">
          <h3>The Foundry Belle</h3>
          <p className="number">No. 14</p>
          <p className="built">Built in 1904</p>
        </article>
        <article className="tram-card">
          <h3>The Wenlow Open-top</h3>
          <p className="number">No. 14</p>
          <p className="built">Built in 1926</p>
        </article>
      </div>
    </div>
  )
}

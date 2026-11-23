import { Gate } from './Gate.jsx'
import { lido } from './lido.js'

export function App() {
  return (
    <div className="desk">
      <h1>Brimwell Lido</h1>
      <Gate capacity={lido.capacity} sessionMinutes={lido.sessionMinutes} />
    </div>
  )
}

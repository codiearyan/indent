import { saturdayLesson } from './lesson.js'
import { Register } from './Register.jsx'

export function App() {
  return (
    <div className="desk">
      <h1>Brimwell Lido</h1>
      <Register lesson={saturdayLesson} />
    </div>
  )
}

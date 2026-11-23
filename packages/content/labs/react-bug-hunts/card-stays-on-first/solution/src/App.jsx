import { MemberDesk } from './MemberDesk.jsx'
import { memberList } from './members.js'

export function App() {
  return (
    <div className="desk">
      <h1>Brimwell Lido</h1>
      <MemberDesk members={memberList} />
    </div>
  )
}

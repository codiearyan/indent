// The studio's staff. The passwords here are only for trying things in this workspace: in the
// studio nobody's password is written down anywhere, and the API keeps only a hash of it.
import { addStaff } from './staff.js'
import { createStaffStore } from './staffStore.js'

export const team = [
  { name: 'Dilys', email: 'dilys@kilnworth.example', role: 'owner', password: 'kiln-door-at-six' },
  { name: 'Kofi', email: 'kofi@kilnworth.example', role: 'teacher', password: 'centre-the-clay' },
  {
    name: 'Sunniva',
    email: 'sunniva@kilnworth.example',
    role: 'desk',
    password: 'friday-glaze-run'
  }
]

/** A staff store with the whole team in it, the way the API starts. */
export function createTeam() {
  const staff = createStaffStore()
  for (const person of team) addStaff(staff, person)
  return staff
}

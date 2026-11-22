// Run with: node try.js
// Hashes one password twice, checks a right and a wrong password against a hash, then saves the
// team and prints what the staff store really holds.
import { hashPassword, verifyPassword } from './src/passwords.js'
import { addStaff } from './src/staff.js'
import { createStaffStore } from './src/staffStore.js'
import { team } from './src/team.js'

function show(label, run) {
  try {
    console.log(`${label}:`, run())
  } catch (err) {
    console.log(`${label}: threw ${err.message}`)
  }
  console.log()
}

let stored = ''
show('hashPassword("wet-clay") twice', () => {
  stored = hashPassword('wet-clay')
  return [stored, hashPassword('wet-clay')]
})
show('verifyPassword("wet-clay", first hash)', () => verifyPassword('wet-clay', stored))
show('verifyPassword("dry-clay", first hash)', () => verifyPassword('dry-clay', stored))

const staff = createStaffStore()
show('addStaff returned', () => team.map((person) => addStaff(staff, person)))
console.log('The staff store holds:', staff.list())

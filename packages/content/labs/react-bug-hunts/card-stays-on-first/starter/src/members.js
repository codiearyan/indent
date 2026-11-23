// Stands in for the lido's membership system. loadMember answers a little later, the way the real
// system does over the network. logSwim records that a member came in for a swim, and the console
// shows each one.
const members = [
  { id: 'm-201', name: 'Hettie Penrose', pass: 'Season pass', swims: 31 },
  { id: 'm-202', name: 'Delphine Nwosu', pass: 'Ten swims', swims: 6 },
  { id: 'm-203', name: 'Mateo Quiroga', pass: 'Season pass', swims: 48 },
  { id: 'm-204', name: 'Bronwen Kittow', pass: 'Early birds', swims: 17 }
]

export const memberList = members.map(({ id, name }) => ({ id, name }))

export function loadMember(id) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ ...members.find((member) => member.id === id) }), 400)
  })
}

export function logSwim(id) {
  const member = members.find((m) => m.id === id)
  member.swims++
  console.log(`Swim logged for ${member.name}`)
}

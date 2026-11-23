// Stands in for the lido's membership system. Both functions answer a little later, the way the
// real system does over the network, and both take a signal that cancels the request.
// A short search matches many members, so the system takes longer to answer it; a member with a
// long history takes longer too.
const members = [
  { id: 'm-201', name: 'Hettie Penrose', visits: ['Mon 7 Jul, early birds', 'Wed 9 Jul, lunchtime', 'Sat 12 Jul, morning'] },
  { id: 'm-202', name: 'Delphine Nwosu', visits: ['Tue 8 Jul, evening'] },
  { id: 'm-203', name: 'Mateo Quiroga', visits: ['Mon 7 Jul, morning', 'Tue 8 Jul, morning', 'Thu 10 Jul, morning', 'Fri 11 Jul, morning', 'Sun 13 Jul, morning'] },
  { id: 'm-205', name: 'Marnie Larkby', visits: ['Sat 12 Jul, lessons'] },
  { id: 'm-204', name: 'Bronwen Kittow', visits: ['Wed 9 Jul, early birds', 'Fri 11 Jul, early birds'] },
  { id: 'm-206', name: 'Ifeoma Bello', visits: ['Sun 13 Jul, evening'] },
  { id: 'm-207', name: 'Kenji Merrow', visits: ['Thu 10 Jul, lunchtime', 'Sat 12 Jul, lunchtime'] },
  { id: 'm-208', name: 'Esme Tregear', visits: [] }
]

function later(ms, signal, value) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(value), ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('The request was cancelled.', 'AbortError'))
    })
  })
}

export function searchMembers(text, { signal } = {}) {
  const found = members
    .filter((member) => member.name.toLowerCase().includes(text.toLowerCase()))
    .map(({ id, name }) => ({ id, name }))
  return later(Math.max(200, 1400 - text.length * 400), signal, found)
}

export function loadVisits(id, { signal } = {}) {
  const member = members.find((m) => m.id === id)
  const visits = member.visits.map((text, n) => ({ id: `${id}-${n}`, text }))
  return later(300 + visits.length * 250, signal, visits)
}

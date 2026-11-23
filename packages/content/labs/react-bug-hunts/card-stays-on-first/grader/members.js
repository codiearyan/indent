// The check's membership system: it writes down every call, and each loadMember waits until the
// check answers it through window.desk.
const desk = { loads: [], swims: [], records: {} }
window.desk = desk

export const memberList = []

export function loadMember(id) {
  return new Promise((resolve) => {
    const load = { id, done: false }
    load.answer = () => {
      if (load.done) return
      load.done = true
      resolve({ ...desk.records[id] })
    }
    desk.loads.push(load)
  })
}

export function logSwim(id) {
  desk.swims.push(id)
}

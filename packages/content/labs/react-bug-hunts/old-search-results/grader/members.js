// The check's membership system: it writes down every request, and each one waits until the check
// answers it through window.desk, in whatever order the check chooses. A request whose signal is
// aborted fails at once, the way a cancelled request does.
const desk = { searches: [], visits: [], members: [], history: {} }
window.desk = desk

function request(list, entry, signal, answer) {
  return new Promise((resolve, reject) => {
    const r = { ...entry, done: false, aborted: false }
    r.answer = () => {
      if (r.done) return
      r.done = true
      resolve(answer())
    }
    if (signal) {
      const cancel = () => {
        if (r.done) return
        r.done = true
        r.aborted = true
        reject(new DOMException('The request was cancelled.', 'AbortError'))
      }
      if (signal.aborted) cancel()
      else signal.addEventListener('abort', cancel, { once: true })
    }
    list.push(r)
  })
}

export function searchMembers(text, { signal } = {}) {
  return request(desk.searches, { text: String(text) }, signal, () =>
    desk.members
      .filter((member) => member.name.toLowerCase().includes(String(text).toLowerCase()))
      .map(({ id, name }) => ({ id, name }))
  )
}

export function loadVisits(id, { signal } = {}) {
  return request(desk.visits, { id }, signal, () => (desk.history[id] ?? []).map((text, n) => ({ id: `${id}-${n}`, text })))
}

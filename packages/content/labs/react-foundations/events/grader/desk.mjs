// The desk as the check sees it: every call is kept, with what it was given.
const calls = (globalThis.deskCalls ??= [])

export function ringBell(...args) {
  calls.push({ fn: 'ringBell', args })
}

export function printTicket(...args) {
  calls.push({ fn: 'printTicket', args })
}

export function recordAnswer(...args) {
  calls.push({ fn: 'recordAnswer', args })
}

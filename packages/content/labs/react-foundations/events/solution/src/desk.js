// The front desk. On the real desk these ring the bell, print a ticket at the till and add one to
// Elspeth's tally. Here each one writes a line in the Browser panel's console, so you can see it.

export function ringBell() {
  console.log('Desk: the bell rings')
}

export function printTicket(kind) {
  console.log(`Desk: printing one ticket, ${kind}`)
}

export function recordAnswer(answer) {
  console.log(`Desk: one more visitor heard about us from ${answer}`)
}

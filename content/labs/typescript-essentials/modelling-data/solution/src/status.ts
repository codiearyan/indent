// Task: Where is my bike?
//
// - Export a type JobStatus: a union of four object types told apart by a kind property.
//     { kind: 'waiting' }
//     { kind: 'in-repair', mechanic: string }
//     { kind: 'waiting-for-parts', part: string, days: number }
//     { kind: 'ready', totalCents: number }
// - statusMessage(status: JobStatus): string returns
//     waiting            'In the queue'
//     in-repair          '<mechanic> is working on it'
//     waiting-for-parts  'Waiting for <part>, about <days> day' (or 'days' when days is not 1)
//     ready              'Ready for pickup, EUR <total in euros with 2 decimals>'
// - Use a switch on kind. Its default branch assigns status to a variable of type never and
//   throws an Error, so adding a fifth kind later is a type error until it is handled.
export type JobStatus =
  | { kind: 'waiting' }
  | { kind: 'in-repair'; mechanic: string }
  | { kind: 'waiting-for-parts'; part: string; days: number }
  | { kind: 'ready'; totalCents: number }

export function statusMessage(status: JobStatus): string {
  switch (status.kind) {
    case 'waiting':
      return 'In the queue'
    case 'in-repair':
      return `${status.mechanic} is working on it`
    case 'waiting-for-parts':
      return `Waiting for ${status.part}, about ${status.days} ${status.days === 1 ? 'day' : 'days'}`
    case 'ready':
      return `Ready for pickup, EUR ${(status.totalCents / 100).toFixed(2)}`
    default: {
      const unhandled: never = status
      throw new Error(`Unknown status: ${JSON.stringify(unhandled)}`)
    }
  }
}

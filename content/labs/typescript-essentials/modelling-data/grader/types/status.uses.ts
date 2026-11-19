import { statusMessage, type JobStatus } from '../src/status.ts'

const all: JobStatus[] = [
  { kind: 'waiting' },
  { kind: 'in-repair', mechanic: 'Yusuf' },
  { kind: 'waiting-for-parts', part: 'a chain', days: 2 },
  { kind: 'ready', totalCents: 4500 }
]

function total(status: JobStatus): number {
  return status.kind === 'ready' ? status.totalCents : 0
}

function kindOf(status: JobStatus): 'waiting' | 'in-repair' | 'waiting-for-parts' | 'ready' {
  return status.kind
}

const text: string = statusMessage(all[0])

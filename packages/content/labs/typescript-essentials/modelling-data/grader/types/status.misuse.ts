import { statusMessage, type JobStatus } from '../src/status.ts'

// @ts-expect-error: a ready job needs its total
const noTotal: JobStatus = { kind: 'ready' }
// @ts-expect-error: a job in repair has a mechanic, not a part
const mixed: JobStatus = { kind: 'in-repair', part: 'a chain' }
// @ts-expect-error: 'lost' is not a job status
const lost: JobStatus = { kind: 'lost' }
// @ts-expect-error: kind is one of four exact strings, not any string
const someKind: JobStatus['kind'] = 'done'
// @ts-expect-error: days is a number
const textDays: JobStatus = { kind: 'waiting-for-parts', part: 'a chain', days: 'two' }
// @ts-expect-error: statusMessage returns a string
const count: number = statusMessage({ kind: 'waiting' })

import { createQueue, type Queue } from '../src/queue.ts'

const jobs = createQueue([{ id: 'SW-1042', bike: 'Norrby' }])
jobs.add({ id: 'SW-1043', bike: 'Larkwheel' })
const nextId: string | undefined = jobs.next()?.id
const front: string | undefined = jobs.peek()?.bike
const count: number = jobs.size()
const names: Queue<string> = createQueue<string>()
names.add('Yusuf')
const typed: Queue<number> = createQueue([1, 2])

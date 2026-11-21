import { chunk, lastItem } from '../src/lists.ts'

const last: string | undefined = lastItem(['SW-1042', 'SW-1043'])
const batches: number[][] = chunk([1, 2, 3], 2)
const jobs = [{ id: 'SW-1042', bike: 'Norrby' }]
const firstBike: string | undefined = chunk(jobs, 10)[0]?.[0]?.bike
const frozen: readonly string[] = ['a', 'b']
const fromFrozen: string | undefined = lastItem(frozen)
const frozenChunks: string[][] = chunk(frozen, 1)

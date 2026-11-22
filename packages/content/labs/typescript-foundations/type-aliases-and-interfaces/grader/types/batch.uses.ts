import { batchLabel, type BatchTin, type Tin } from '../src/orders.ts'

// A plain tin is still a Tin, with no batch
const plain: Tin = { blend: 'Hearth Assam', grams: 125 }
// A batch tin has everything a tin has, and a batch number
const batch: BatchTin = { blend: 'Frost Sencha', grams: 50, batch: 7 }
// A batch tin can go anywhere a tin can
const asTin: Tin = batch
const label: string = batchLabel(batch)

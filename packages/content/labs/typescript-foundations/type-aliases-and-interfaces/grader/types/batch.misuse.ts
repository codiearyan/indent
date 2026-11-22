import { batchLabel, type BatchTin, type Tin } from '../src/orders.ts'

const plain: Tin = { blend: 'Hearth Assam', grams: 125 }
// @ts-expect-error: a batch tin without its batch number is refused
const noBatch: BatchTin = { blend: 'Frost Sencha', grams: 50 }
// @ts-expect-error: a batch tin still needs the grams every tin has
const noGrams: BatchTin = { blend: 'Frost Sencha', batch: 7 }
// @ts-expect-error: a batch number is a number, so text is refused
const wordy: BatchTin = { blend: 'Frost Sencha', grams: 50, batch: 'seven' }
// @ts-expect-error: a plain tin has no batch, so batchLabel refuses it
batchLabel(plain)
// @ts-expect-error: a label is text, so it is not a number
const asNumber: number = batchLabel({ blend: 'Frost Sencha', grams: 50, batch: 7 })

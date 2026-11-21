// Run with: node src/demo.ts
// Type-check with: npm run types
import { readBookings } from './import.ts'
import { describeOrderFailure, errorMessage, PartNotFoundError } from './errors.ts'
import { getQuote, unwrapOr } from './quotes.ts'

async function show(label: string, run: () => unknown): Promise<void> {
  try {
    console.log(label, JSON.stringify(await run()))
  } catch (error) {
    console.log(label, `Error: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const exported = JSON.stringify([
  { id: 'SW-0981', customer: 'Petra Lindqvist', priceCents: 6500 },
  { id: 'SW-0982', customer: 'Omar Haddad', priceCents: '35.00' },
  null,
  { id: 'SW-0983', customer: 'June Ferreira', priceCents: 12000 }
])

const supplier = async (partId: string): Promise<number> => {
  if (partId === 'chain-8s') return 1899
  if (partId === 'hub-gear') throw new Error('Supplier offline')
  throw 'timeout'
}

await show('valid rows from the old export:', () => readBookings(exported).map((row) => row.id))
await show('messages for three thrown values:', () => [
  errorMessage(new Error('Disk full')),
  errorMessage('timeout'),
  errorMessage(42)
])
await show('order failures:', () => [
  describeOrderFailure(new PartNotFoundError('a 28-inch rim')),
  describeOrderFailure({ message: 'Rate limited' })
])
await show('quotes:', () =>
  Promise.all([getQuote('chain-8s', supplier), getQuote('hub-gear', supplier), getQuote('saddle', supplier)])
)
await show('price or 0:', async () => unwrapOr(await getQuote('hub-gear', supplier), 0))

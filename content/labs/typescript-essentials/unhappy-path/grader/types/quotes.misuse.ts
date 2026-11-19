import { getQuote, unwrapOr, type Result } from '../src/quotes.ts'

async function misuse(): Promise<void> {
  const quote = await getQuote('chain-8s', async () => 1899)
  // @ts-expect-error: check ok before reading the value
  quote.value
  // @ts-expect-error: getQuote returns a promise, so it must be awaited first
  const notAwaited: Result<number> = getQuote('chain-8s', async () => 1899)
  // @ts-expect-error: a failed result has no value
  const failedWithValue: Result<number> = { ok: false, value: 3 }
  // @ts-expect-error: a successful result needs a value
  const emptySuccess: Result<number> = { ok: true }
  // @ts-expect-error: fetchPrice must resolve to a number
  getQuote('chain-8s', async () => 'cheap')
  // @ts-expect-error: the fallback has the same type as the value
  unwrapOr(quote, 'none')
}

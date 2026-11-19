import { getQuote, unwrapOr, type Result } from '../src/quotes.ts'

async function uses(): Promise<void> {
  const quote = await getQuote('chain-8s', async () => 1899)
  if (quote.ok) {
    const price: number = quote.value
  } else {
    const reason: string = quote.error
  }
  const price: number = unwrapOr(quote, 0)
  const pending: Promise<Result<number>> = getQuote('chain-8s', async () => 1899)
  const custom: Result<string, Error> = { ok: false, error: new Error('x') }
  const fallback: string = unwrapOr(custom, 'none')
  const fine: Result<boolean> = { ok: true, value: true }
}

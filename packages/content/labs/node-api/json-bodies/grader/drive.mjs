// Copied into the sandbox as .grader/drive.mjs. Calls validateQuote on many inputs in one process.
import { validateQuote } from '../src/quote.js'

export function validateAll(inputs) {
  return inputs.map((input) => {
    try {
      return { value: validateQuote(input) }
    } catch (err) {
      const { name, message, status, code, details } = err
      return { thrown: { name, message, status, code, details } }
    }
  })
}

// Copied into the sandbox as .grader/drive.mjs. Calls the learner's functions on many inputs at once.
import { isExactMatch, normalizeLabel } from '../src/evaluate.ts'

const attempt = (fn) => {
  try {
    return { ok: true, value: fn() }
  } catch (err) {
    return { ok: false, error: String(err?.message ?? err) }
  }
}

export const labels = (inputs) => inputs.map((text) => attempt(() => normalizeLabel(text)))

export const matches = (pairs) => pairs.map(([output, expected]) => attempt(() => isExactMatch(output, expected)))

// Copied into the sandbox as .grader/drive.mjs. Reads config.ts and runs evaluate.
import * as config from '../src/config.ts'
import { evaluate } from '../src/evaluate.ts'
import { labelled } from '../src/labelled.ts'

export function settings() {
  return { ...config }
}

export function run(settings, questionCount) {
  return evaluate(settings, questionCount == null ? undefined : labelled.slice(0, questionCount))
}

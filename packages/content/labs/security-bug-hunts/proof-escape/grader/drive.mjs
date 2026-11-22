// Copied into the sandbox as .grader/drive.mjs. Downloads with the learner's readProof() from
// the sandbox's own proofs folder.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readProof } from '../src/proofs.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const proofs = join(root, 'proofs')

// A proof whose name holds two dots in a row: honest, and inside the folder.
const DOTTED = { name: '2044/back..v2.txt', text: 'PROOF 2044, back, second try\n' }

export async function read(cases) {
  mkdirSync(join(proofs, '2044'), { recursive: true })
  writeFileSync(join(proofs, DOTTED.name), DOTTED.text)
  const results = []
  for (const { name, absolute } of cases) {
    const fileName = absolute ? join(root, name) : name
    try {
      results.push({ fileName, got: await readProof(proofs, fileName) })
    } catch (err) {
      results.push({ fileName, error: `${err.name}: ${err.message}` })
    }
  }
  return results
}

/** Whether the original code's join() of this name leaves the proofs folder. */
export function leaves(fileName) {
  return !join(proofs, fileName).startsWith(proofs + sep)
}

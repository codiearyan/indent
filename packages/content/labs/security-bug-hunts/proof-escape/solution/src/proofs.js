// Task 2: keep every download inside the proofs folder (ticket AP-22).
//
// readProof(proofsDir, fileName) returns the text of a proof file inside proofsDir, or null when
// there is no proof to give. proofsDir is an absolute path. fileName comes from the download
// link, such as /proofs?file=2041/front.txt, so the customer can change it to anything.
// Keep the function name, its arguments and what it returns.

import { readFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'

export function readProof(proofsDir, fileName) {
  const folder = resolve(proofsDir)
  const file = resolve(folder, fileName)
  if (!file.startsWith(folder + sep)) return null
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return null
  }
}

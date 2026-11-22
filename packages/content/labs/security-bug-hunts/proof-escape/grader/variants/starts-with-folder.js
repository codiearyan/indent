import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function readProof(proofsDir, fileName) {
  const file = resolve(proofsDir, fileName)
  if (!file.startsWith(resolve(proofsDir))) return null
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return null
  }
}

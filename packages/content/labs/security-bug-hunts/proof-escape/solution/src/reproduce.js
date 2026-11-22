// Task 1: catch a download reading a file outside the proofs folder (ticket LL-22).
//
// Pick a fileName that leads out of the proofs folder to a file that exists, and run it through
// the original readProof() with PROOFS_DIR. Return { fileName, shown }:
// - shown: exactly what readProof(PROOFS_DIR, fileName) returned
// `node src/demo.js` prints what this function returns.
import { PROOFS_DIR } from './folders.js'
import { readProof } from './proofs.js'

export function reproduceProofEscape() {
  const fileName = '../config/mail.json'
  return { fileName, shown: readProof(PROOFS_DIR, fileName) }
}

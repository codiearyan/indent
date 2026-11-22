// Where the portal keeps its files. Customers may download what is in proofs/ and nothing else.
import { fileURLToPath } from 'node:url'

export const PROOFS_DIR = fileURLToPath(new URL('../proofs', import.meta.url))

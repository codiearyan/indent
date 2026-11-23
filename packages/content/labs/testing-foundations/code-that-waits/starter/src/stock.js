// What is in the shed. Wendell counts the shed every morning and his tablet saves the counts to
// shed.json. Reading a file takes a moment, so these functions answer later, with a promise.
import { readFile } from 'node:fs/promises'

const SHEET = new URL('../shed.json', import.meta.url)

async function readShed() {
  return JSON.parse(await readFile(SHEET, 'utf8'))
}

// How many of one item are in the shed.
export async function countOf(item) {
  const shed = await readShed()
  if (!(item in shed)) {
    throw new Error(`The shed has no count for ${item}`)
  }
  return shed[item]
}

// Whether the shed has enough of every item for this many boxes. Each box takes one of each.
export async function canPack(items, boxes) {
  for (const item of items) {
    const count = await countOf(item)
    if (count < boxes) return false
  }
  return true
}

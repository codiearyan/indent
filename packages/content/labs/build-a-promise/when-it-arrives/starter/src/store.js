// The store room's paper count, kept in data/paper.json. Reading a file takes a moment,
// so the answer comes on a docket.
import { readFile } from 'node:fs'
import { Docket } from './docket.js'

const PAPER = new URL('../data/paper.json', import.meta.url)

// A docket for how many sheets of paper for this item are in the store room.
export function sheetsInStock(item) {
  return new Docket((resolve, reject) => {
    readFile(PAPER, 'utf8', (error, text) => {
      if (error) return reject(error)
      const stock = JSON.parse(text)
      if (item in stock) resolve(stock[item])
      else reject(new Error(`No paper listed for ${item}`))
    })
  })
}

// The store room's paper count and the press queue, kept in data/. Reading a file takes a
// moment, so every answer comes on a docket.
import { readFile } from 'node:fs'
import { Docket } from './docket.js'

// A press takes three jobs a day.
const JOBS_PER_DAY = 3

function readJson(name) {
  return new Docket((resolve, reject) => {
    readFile(new URL(`../data/${name}`, import.meta.url), 'utf8', (error, text) => {
      if (error) return reject(error)
      resolve(JSON.parse(text))
    })
  })
}

// A docket for how many sheets of paper for this item are in the store room.
export function sheetsInStock(item) {
  return new Docket((resolve, reject) => {
    readJson('paper.json').then((stock) => {
      if (item in stock) resolve(stock[item])
      else reject(new Error(`No paper listed for ${item}`))
    }, reject)
  })
}

// A docket for the first day the press queue has room for one more job.
export function firstFreeDay() {
  return new Docket((resolve, reject) => {
    readJson('queue.json').then((queue) => {
      const free = queue.find((day) => day.jobs < JOBS_PER_DAY)
      if (free) resolve(free.day)
      else reject(new Error('The press queue is full'))
    }, reject)
  })
}

// The store room's paper count and the press queue, kept in data/. Reading a file takes a
// moment, so every answer comes on a docket. The paper count is read once a night and then
// kept in memory, so a second answer is ready at once.
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

// The paper count, once it has been read.
let stock

// A docket for how many sheets of paper for this item are in the store room.
export function sheetsInStock(item) {
  const count = stock ? new Docket((resolve) => resolve(stock)) : readJson('paper.json')
  return count.then((found) => {
    stock = found
    if (!(item in found)) throw new Error(`No paper listed for ${item}`)
    return found[item]
  })
}

// A docket for the first day the press queue has room for one more job.
export function firstFreeDay() {
  return readJson('queue.json').then((queue) => {
    const free = queue.find((day) => day.jobs < JOBS_PER_DAY)
    if (!free) throw new Error('The press queue is full')
    return free.day
  })
}

// A docket that fails after `ms`, for a race against something that may never answer.
export function giveUpAfter(ms, what) {
  return new Docket((resolve, reject) => {
    // unref(): this timer alone does not keep the script running.
    setTimeout(() => reject(new Error(`${what} did not answer within ${ms} ms`)), ms).unref()
  })
}

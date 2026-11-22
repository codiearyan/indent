// The job book: every job the press has taken on today.
import { quote } from './quote.js'

export function createJobBook() {
  const jobs = []
  return {
    add(job) {
      jobs.push(job)
      return jobs.length
    },
    count() {
      return jobs.length
    },
    total() {
      return jobs.reduce((sum, job) => sum + quote(job), 0)
    }
  }
}

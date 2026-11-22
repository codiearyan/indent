// Copied into the sandbox as .grader/drive.mjs. Each export is one case: it hands the learner's
// function the check's own machines, which fail when the case says so, and reports what happened.
import { promiseCase } from './waiting.mjs'

const FILE = '../src/payments.js'

/** A card machine that gives each charge, in turn, the next answer: a code, or an error message. */
const card = (answers) => ({
  answer: (args, n) => {
    const a = answers[Math.min(n, answers.length - 1)]
    return a.error ? { error: a.error } : { value: { approved: true, code: a.code } }
  }
})

const screen = { screenOn: { now: true }, screenOff: { now: true } }

export const pay = (order, answers) => promiseCase(FILE, 'tryPayment', [order], { chargeCard: card(answers) })

export const parcel = (id, status) =>
  promiseCase(FILE, 'parcelOrUnknown', [id], {
    trackParcel: {
      answer: ([asked]) => (status ? { value: { id: asked, status } } : { error: `No news of ${asked}` })
    }
  })

export const retry = (cents, tries, answers) =>
  promiseCase(FILE, 'chargeWithRetries', [cents, tries], { chargeCard: card(answers) })

export const screened = (order, answers) =>
  promiseCase(FILE, 'payWithScreen', [order], { chargeCard: card(answers), ...screen })

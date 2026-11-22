import { code, ending, partOf, play, promised, readSource, shape, show } from '../../waiting-grading.mjs'

const FILE = 'src/payments.js'

const asked = (r, name) => r.calls.filter((c) => c.name === name)
const sync = (r, fn) => r.log.some((l) => l.startsWith(`${fn} stopped with`))
const at = (r, start) => r.log.findIndex((l) => l.startsWith(start))
const receipt = (code) => ({ approved: true, code })

/** The message for a failure of a machine that reached the caller, though the task catches it. */
const escaped = (fn, r, machine) =>
  `The ${machine}'s failure reached the caller: the promise ${fn} gave back was ${ending(r)}. try...catch only catches a failure that is awaited inside the try. A promise handed on with return, or one never awaited, fails after the try is over.`

export const checks = {
  pay(t) {
    return play(t, {
      file: FILE,
      fn: 'tryPayment',
      cases: [
        { o: { id: 'WC-4107', totalCents: 2200 }, answers: [{ code: 'A-411' }], want: 'WC-4107 paid, code A-411' },
        { o: { id: 'WC-4108', totalCents: 8800 }, answers: [{ error: 'Card declined' }], want: 'WC-4108 not paid: Card declined' },
        { o: { id: 'WC-4109', totalCents: 1500 }, answers: [{ error: 'Machine busy' }], want: 'WC-4109 not paid: Machine busy' }
      ].map((c) => ({
        name: c.answers[0].error ? `Says why ${c.o.id} was not paid` : `Pays ${c.o.id}`,
        run: 'pay',
        args: [c.o, c.answers],
        setup: `tryPayment(${show(c.o)}), and the card machine ${c.answers[0].error ? `fails with Error(${show(c.answers[0].error)})` : `answers { approved: true, code: ${show(c.answers[0].code)} }`}`,
        judge(r) {
          const charges = asked(r, 'chargeCard')
          if (!sync(r, 'tryPayment')) {
            if (charges.length === 0) return 'tryPayment never charged the card. Call chargeCard with the order total.'
            if (charges.length > 1) return 'tryPayment charged the card more than once. One charge is enough.'
            if (charges[0].args[0] !== show(c.o.totalCents)) return `chargeCard was asked to charge ${charges[0].args[0]}. It takes the order's totalCents.`
          }
          return promised(r, 'tryPayment', c.want, (r) => {
            const o = r.outcome
            if (o.state === 'rejected' && o.error.message === c.answers[0].error) return escaped('tryPayment', r, 'card machine')
            if (/Error: /.test(o.shown ?? '')) {
              return 'The line has the word Error in it: the whole error was put in the text. The task asks for its message alone, which an error keeps in its message property.'
            }
            if (/code undefined/.test(o.shown ?? '')) {
              return 'The code came out undefined: the line was made before the receipt arrived. await the charge inside the try.'
            }
            return undefined
          })
        }
      }))
    })
  },

  async parcel(t) {
    const body = partOf(code(await readSource(t, FILE)), 'parcelOrUnknown').replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, "''")
    const details = await play(t, {
      file: FILE,
      fn: 'parcelOrUnknown',
      cases: [
        ['P-31', 'packed'],
        ['P-48', 'delivered'],
        ['P-90', null],
        ['P-5', null]
      ].map(([id, status]) => ({
        name: status ? `Gives the status of ${id}` : `Says there is no news of ${id}`,
        run: 'parcel',
        args: [id, status],
        setup: `parcelOrUnknown(${show(id)}), and the tracker ${status ? `answers { id: ${show(id)}, status: ${show(status)} }` : `fails with Error(${show(`No news of ${id}`)})`}`,
        judge(r) {
          const tracked = asked(r, 'trackParcel')
          if (!sync(r, 'parcelOrUnknown')) {
            if (tracked.length === 0 && r.outcome?.state !== 'not a promise') return 'parcelOrUnknown never asked the tracker. Call trackParcel with the id.'
            if (tracked.length && tracked[0].args[0] !== show(id)) return `trackParcel was asked about ${tracked[0].args[0]}. Ask about the id parcelOrUnknown is given.`
          }
          return promised(r, 'parcelOrUnknown', status ? `${id}: ${status}` : `${id}: no news yet`, (r) => {
            const o = r.outcome
            if (o.state === 'rejected' && /^No news/.test(o.error.message)) {
              return "The tracker's failure reached the caller. catch at the end of the chain catches a failure of any step before it, and gives back what to use instead."
            }
            if (!status && /undefined/.test(o.shown ?? '')) {
              return 'When the tracker failed, the line came out with undefined in it. The catch sits before the then, so its answer went on through the then. Put catch at the end of the chain.'
            }
            if (!status && o.shown === 'undefined') {
              return 'When the tracker failed, the promise was fulfilled with undefined. The function you hand catch gives back the line to use instead.'
            }
            return undefined
          })
        }
      }))
    })
    if (details.length === 1) return details
    return [
      ...details,
      shape(
        'Written as a chain',
        /\.catch\s*\(/.test(body) && !/\bawait\b/.test(body),
        /\bawait\b/.test(body)
          ? 'The task asks for a chain here, with then and catch and no await: the same work written the other way. You will read code written both ways.'
          : 'The task asks for catch on the chain. Add .catch(...) at the end, with a function that gives back the line to use instead.'
      )
    ]
  },

  retry(t) {
    return play(t, {
      file: FILE,
      fn: 'chargeWithRetries',
      cases: [
        { cents: 2600, tries: 3, answers: [{ error: 'Machine busy' }, { error: 'Machine busy' }, { code: 'A-520' }] },
        { cents: 1900, tries: 4, answers: [{ code: 'B-007' }] },
        { cents: 8800, tries: 2, answers: [{ error: 'Machine busy' }, { error: 'Card declined' }] },
        { cents: 4100, tries: 5, answers: [{ error: 'Machine busy' }, { error: 'Machine busy' }, { error: 'Machine busy' }, { error: 'Machine busy' }, { code: 'C-310' }] },
        { cents: 3300, tries: 1, answers: [{ error: 'Card declined' }, { code: 'D-999' }] }
      ].map((c) => {
        const first = c.answers.findIndex((a) => a.code)
        const works = first !== -1 && first < c.tries
        const needed = works ? first + 1 : c.tries
        const told = c.answers.slice(0, Math.max(needed, 1)).map((a) => (a.code ? `goes through with ${show(a.code)}` : `fails with ${show(a.error)}`)).join(', then ')
        return {
          name: works ? `Charges ${c.cents} in ${needed} ${needed === 1 ? 'try' : 'tries'} of ${c.tries}` : `Gives up on ${c.cents} after ${c.tries} ${c.tries === 1 ? 'try' : 'tries'}`,
          run: 'retry',
          args: [c.cents, c.tries, c.answers],
          setup: `chargeWithRetries(${c.cents}, ${c.tries}), and the card machine ${told}`,
          judge(r) {
            if (sync(r, 'chargeWithRetries')) return promised(r, 'chargeWithRetries', null)
            const charges = asked(r, 'chargeCard')
            if (charges.length === 0) return 'chargeWithRetries never charged the card. Call chargeCard with the total.'
            if (charges.some((x) => x.args[0] !== show(c.cents))) return 'chargeCard was asked for another total than the one chargeWithRetries is given.'
            if (charges.some((x, i) => i > 0 && x.startedAfter < i)) {
              return 'A new try started before the last one had failed. Try one charge at a time: wait for each one before the next.'
            }
            if (charges.length > needed) {
              return works
                ? `chargeWithRetries charged the card ${charges.length} times, though try ${needed} went through. Stop trying once a charge goes through.`
                : `chargeWithRetries charged the card ${charges.length} times. It tries at most tries times, ${c.tries} here.`
            }
            if (charges.length < needed) {
              return `chargeWithRetries gave up after ${charges.length} ${charges.length === 1 ? 'try' : 'tries'}, though it may try ${c.tries} times and none had gone through.${charges.length > 1 ? ' Count how many times your loop goes round: once for every try, tries times in all.' : r.outcome?.state === 'rejected' ? ' A failed charge ends the function unless it is caught: catch each failed try, so the next one can run.' : ''}`
            }
            const o = r.outcome ?? {}
            if (!works) {
              const last = c.answers[c.tries - 1].error
              if (o.state === 'rejected' && o.error.message === last) return undefined
              if (o.state === 'rejected') {
                return `The promise was rejected with ${o.error.message}, which is not the error of the last try. Keep the error of each failed try, and reject with the last one.`
              }
              if (o.state === 'fulfilled') {
                return `Every try failed, but the promise was fulfilled with ${o.shown}. The failure must reach the caller: reject with the error of the last try, for example by throwing it.`
              }
              return promised(r, 'chargeWithRetries', null)
            }
            return promised(r, 'chargeWithRetries', receipt(c.answers[first].code), (r) =>
              r.outcome.state === 'rejected'
                ? `The promise was rejected with ${r.outcome.error.message}, though a try went through. Catch each failed try so the next one can run.`
                : undefined
            )
          }
        }
      })
    })
  },

  screen(t) {
    return play(t, {
      file: FILE,
      fn: 'payWithScreen',
      cases: [
        { o: { id: 'WC-4310', totalCents: 1200 }, answers: [{ code: 'A-777' }] },
        { o: { id: 'WC-4311', totalCents: 7700 }, answers: [{ error: 'Card declined' }] },
        { o: { id: 'WC-4312', totalCents: 2600 }, answers: [{ error: 'Machine busy' }] }
      ].map((c) => {
        const fails = c.answers[0].error
        return {
          name: fails ? `Turns the screen off when ${c.o.id} fails, and passes the failure on` : `Turns the screen off when ${c.o.id} is paid`,
          run: 'screened',
          args: [c.o, c.answers],
          setup: `payWithScreen(${show(c.o)}), and the card machine ${fails ? `fails with Error(${show(fails)})` : `answers { approved: true, code: ${show(c.answers[0].code)} }`}`,
          judge(r) {
            if (sync(r, 'payWithScreen')) return promised(r, 'payWithScreen', null)
            const on = asked(r, 'screenOn')
            const off = asked(r, 'screenOff')
            const charge = at(r, 'chargeCard(')
            const answered = r.log.findIndex((l) => /^chargeCard\(.*\) (answered|failed)/.test(l))
            if (charge === -1) return 'payWithScreen never charged the card. Call chargeCard with the order total.'
            if (on.length !== 1) return on.length ? 'screenOn was called more than once. Once, before the charge.' : 'payWithScreen never called screenOn. Turn the screen on before the charge.'
            if (at(r, 'screenOn(') > charge) return 'The screen was turned on after the charge had started. Turn it on first.'
            if (off.length === 0) {
              return fails
                ? 'The charge failed and the screen stayed on. Turning it off must happen whether the charge went through or failed, not only after a receipt.'
                : 'payWithScreen never called screenOff. Turn the screen off once the machine has answered.'
            }
            if (off.length > 1) return 'screenOff was called more than once. Once is enough, whichever way the charge went.'
            if (at(r, 'screenOff(') < answered) {
              return 'The screen was turned off before the card machine had answered. Wait for the charge first, then turn it off.'
            }
            const o = r.outcome ?? {}
            if (fails) {
              if (o.state === 'rejected' && o.error.message === fails) return r.unhandled.length ? 'The failure also reached Node with nothing to catch it. Let one promise carry it: the one payWithScreen gives back.' : undefined
              if (o.state === 'fulfilled') {
                return `The charge failed, but the promise was fulfilled with ${o.shown}, so the caller thinks it worked. Turn the screen off without turning the failure into a value: the failure must go on to the caller.`
              }
              return promised(r, 'payWithScreen', null)
            }
            return promised(r, 'payWithScreen', receipt(c.answers[0].code))
          }
        }
      })
    })
  }
}

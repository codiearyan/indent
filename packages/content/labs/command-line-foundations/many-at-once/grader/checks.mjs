import { join } from 'node:path'
import { check, filesUnder, findByName, isDir, kind, listing, names, read, starterText } from '../../grading.mjs'

/** Starter files directly in `folder` whose names pass `keep`. */
const starterNames = (t, folder, keep) =>
  names(t.chapterPath(`starter/${folder}`)).filter((n) => kind(t.chapterPath(`starter/${folder}`), n) === 'file' && keep(n))

const list = (items) => (items.length > 3 ? `${items.slice(0, 3).join(', ')} and ${items.length - 3} more` : items.join(', '))

/**
 * Judges a move of every `wanted` file from `from` into `to`: all of them there with their
 * contents and gone from `from`, and none of the `unwanted` ones carried along.
 */
function judgeMove(t, { from, to, wanted, unwanted, what }) {
  const ws = t.workspace
  const output = `${from}:\n${listing(ws, ...from.split('/'))}\n\n${to}:\n${listing(ws, ...to.split('/'))}`
  const same = (dir, n) => read(join(ws, ...dir.split('/'), n)) === starterText(t, `${from}/${n}`)
  const arrived = wanted.filter((n) => same(to, n))
  const stayed = wanted.filter((n) => kind(ws, ...from.split('/'), n) === 'file')
  const extra = unwanted.filter((n) => kind(ws, ...to.split('/'), n) === 'file')
  let message
  if (extra.length) {
    message = `${to} now also holds ${list(extra)}, which ${extra.length > 1 ? 'are' : 'is'} not among ${what}. Only ${what} belong there: move ${extra.length > 1 ? 'those' : 'it'} back to ${from}.`
  } else if (arrived.length === wanted.length && stayed.length) {
    message = `${list(stayed)} ${stayed.length > 1 ? 'are' : 'is'} in ${to}, and still in ${from} too. Those are copies: a move leaves nothing behind.`
  } else if (arrived.length < wanted.length) {
    const left = wanted.filter((n) => !arrived.includes(n))
    const lost = left.filter((n) => !stayed.includes(n))
    const found = lost.map((n) => findByName(ws, n)[0]).filter(Boolean)
    message = found.length
      ? `${found[0].split('/').pop()} is in ${found[0].includes('/') ? found[0].slice(0, found[0].lastIndexOf('/')) : 'the top folder'}, not in ${to}${lost.length > 1 ? `, and ${lost.length - 1} more went astray too` : ''}.`
      : lost.length
        ? `${list(lost)} ${lost.length > 1 ? 'are' : 'is'} neither in ${from} nor in ${to}, nor anywhere else. Reset brings back the starter's files.`
        : `${list(left)} ${left.length > 1 ? 'are' : 'is'} still in ${from}.`
  } else {
    return check(`All of ${what} are in ${to}`, true, '', output)
  }
  return check(`All of ${what} are in ${to}`, false, message, output)
}

export const checks = {
  async drawings(t) {
    const all = starterNames(t, 'downloads', () => true)
    const wanted = all.filter((n) => n.endsWith('.svg'))
    return [
      judgeMove(t, {
        from: 'downloads',
        to: 'artwork',
        wanted,
        unwanted: all.filter((n) => !wanted.includes(n)),
        what: 'the drawings'
      })
    ]
  },

  async invoices(t) {
    const all = starterNames(t, 'downloads', () => true)
    const wanted = all.filter((n) => n.startsWith('invoice-'))
    return [
      judgeMove(t, {
        from: 'downloads',
        to: 'invoices/march',
        wanted,
        unwanted: all.filter((n) => !wanted.includes(n)),
        what: 'the invoices'
      })
    ]
  },

  async pellow(t) {
    const ws = t.workspace
    const all = starterNames(t, 'orders', () => true)
    const wanted = all.filter((n) => n.endsWith('-pellow.txt'))
    if (!isDir(ws, 'orders', 'pellow')) {
      const message =
        kind(ws, 'orders', 'pellow') === 'file'
          ? 'orders/pellow is a file, not a folder.'
          : isDir(ws, 'pellow')
            ? 'There is a pellow folder in the top folder. It belongs inside orders.'
            : 'orders has no pellow folder yet. Make it before you move anything into it.'
      return [check('All of the Pellow Bakery orders are in orders/pellow', false, message, `orders:\n${listing(ws, 'orders')}`)]
    }
    const others = all.filter((n) => !wanted.includes(n))
    return [
      judgeMove(t, {
        from: 'orders',
        to: 'orders/pellow',
        wanted,
        unwanted: others,
        what: 'the Pellow Bakery orders'
      }),
      leftAlone(t, others)
    ]
  }
}

/** The pellow task also asks that orders/2026 and the other customers' orders stay as they were. */
function leftAlone(t, others) {
  const ws = t.workspace
  const name = 'The 2026 folder and the other orders are left alone'
  const output = `orders:\n${listing(ws, 'orders')}\n\norders/2026:\n${listing(ws, 'orders', '2026')}`
  const year = filesUnder(t.chapterPath('starter/orders/2026'))
  const strayed = year.filter((rel) => read(join(ws, 'orders', '2026', ...rel.split('/'))) !== starterText(t, `orders/2026/${rel}`))
  const moved = others.filter((n) => kind(ws, 'orders', n) !== 'file')
  let message
  if (isDir(ws, 'orders', 'pellow', '2026')) {
    message = 'The 2026 folder went into orders/pellow too. It stays in orders as it was: move it back.'
  } else if (strayed.length) {
    message = `${list(strayed.map((rel) => `2026/${rel}`))} ${strayed.length > 1 ? 'have' : 'has'} left orders/2026. Only the orders loose in orders move; the 2026 folder stays as it was, so put ${strayed.length > 1 ? 'them' : 'it'} back.`
  } else if (moved.length) {
    message = `${list(moved)} ${moved.length > 1 ? 'have' : 'has'} left orders. Orders from other customers stay where they are: move ${moved.length > 1 ? 'them' : 'it'} back to orders.`
  } else {
    return check(name, true, '', output)
  }
  return check(name, false, message, output)
}

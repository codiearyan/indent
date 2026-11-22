import { join } from 'node:path'
import {
  check, filesUnder, findByContent, isDir, isFile, kind, listing, names, read, starterText
} from '../../grading.mjs'

const at = (ws, rel) => read(join(ws, ...rel.split('/')))
const otherCase = (dir, name) => names(dir).find((n) => n !== name && n.toLowerCase() === name.toLowerCase())

/** Where a starter file went, if not where it should be, in words; null when it is nowhere. */
function whereNow(ws, content, skip) {
  const found = findByContent(ws, content).filter((rel) => !skip.includes(rel))
  if (!found.length) return null
  return found[0].includes('/') ? `at ${found[0]}` : `in the top folder as ${found[0]}`
}

export const checks = {
  async move(t) {
    const name = 'invoice-0303.csv is in invoices/march'
    const ws = t.workspace
    const content = starterText(t, 'invoice-0303.csv')
    const target = 'invoices/march/invoice-0303.csv'
    const output = `top folder:\n${listing(ws)}\n\ninvoices/march:\n${listing(ws, 'invoices', 'march')}`
    const there = isFile(ws, 'invoices', 'march', 'invoice-0303.csv')
    const left = isFile(ws, 'invoice-0303.csv')
    if (there && at(ws, target) === content && !left) return [check(name, true, '', output)]
    let message
    if (there && at(ws, target) !== content) {
      message = 'invoices/march/invoice-0303.csv is there, but it is not the invoice that was in the top folder: its contents differ.'
    } else if (there) {
      message = 'invoice-0303.csv is in invoices/march, and still in the top folder too. That is a copy: a move leaves nothing behind where the file was.'
    } else if (!isDir(ws, 'invoices', 'march')) {
      message = 'invoices/march is gone or is not a folder any more. Reset brings back the starter\'s files.'
    } else {
      const elsewhere = whereNow(ws, content, ['invoice-0303.csv'])
      message = elsewhere
        ? `The invoice is ${elsewhere}, not at ${target}. Move it into invoices/march and keep its name.`
        : left
          ? 'invoice-0303.csv is still in the top folder.'
          : 'invoice-0303.csv is gone from the top folder and is nowhere in the workspace. Reset brings back the starter\'s files.'
    }
    return [check(name, false, message, output)]
  },

  async rename(t) {
    const name = 'The fox poster is called fox-poster.svg'
    const ws = t.workspace
    const old = 'fox-poster-FINAL-v2-REAL.svg'
    const content = starterText(t, `artwork/${old}`)
    const output = `artwork:\n${listing(ws, 'artwork')}`
    const renamed = isFile(ws, 'artwork', 'fox-poster.svg')
    const left = isFile(ws, 'artwork', old)
    if (renamed && at(ws, 'artwork/fox-poster.svg') === content && !left) return [check(name, true, '', output)]
    let message
    if (renamed && at(ws, 'artwork/fox-poster.svg') !== content) {
      message = 'artwork/fox-poster.svg is there, but it is not the fox poster: its contents differ from the file it should come from.'
    } else if (renamed) {
      message = `artwork has fox-poster.svg and still ${old}. That is a copy: renaming leaves no file under the old name.`
    } else if (otherCase(join(ws, 'artwork'), 'fox-poster.svg')) {
      message = `artwork has ${otherCase(join(ws, 'artwork'), 'fox-poster.svg')}, but names care about capital letters. The task asks for fox-poster.svg.`
    } else {
      const elsewhere = whereNow(ws, content, [`artwork/${old}`])
      message = elsewhere
        ? `The fox poster is now ${elsewhere}. It should stay in artwork, named fox-poster.svg.`
        : left
          ? `artwork still has the poster under its old name, ${old}.`
          : 'The fox poster is gone from artwork and is nowhere in the workspace. Reset brings back the starter\'s files.'
    }
    return [check(name, false, message, output)]
  },

  async copy(t) {
    const name = 'prices-2025.csv is a copy of prices.csv'
    const ws = t.workspace
    const content = starterText(t, 'prices.csv')
    const output = listing(ws)
    const copy = at(ws, 'prices-2025.csv')
    const original = isFile(ws, 'prices.csv') ? at(ws, 'prices.csv') : null
    let message
    if (original === null) {
      message = 'prices.csv is gone from the top folder. A copy leaves the original where it was: put prices.csv back first.'
    } else if (original !== content) {
      message = 'prices.csv has changed since the issue started. Hesper has not changed the prices yet, so it should be as it was. Reset puts it back.'
    } else if (!isFile(ws, 'prices-2025.csv')) {
      message = otherCase(ws, 'prices-2025.csv')
        ? `There is ${otherCase(ws, 'prices-2025.csv')}, but names care about capital letters. The task asks for prices-2025.csv.`
        : kind(ws, 'prices-2025.csv') === 'dir'
          ? 'prices-2025.csv is a folder, not a file.'
          : isFile(ws, 'prices-2025')
            ? 'There is a prices-2025 without .csv at the end. The ending is part of the name.'
            : 'The top folder has no prices-2025.csv yet.'
    } else if (copy !== content) {
      message = 'prices-2025.csv is there, but its contents differ from prices.csv. It should be an exact copy.'
    } else {
      return [check(name, true, '', output)]
    }
    return [check(name, false, message, output)]
  },

  async backup(t) {
    const name = 'orders-backup holds a copy of orders'
    const ws = t.workspace
    const starterOrders = filesUnder(t.chapterPath('starter/orders'))
    const k = kind(ws, 'orders-backup')
    if (k !== 'dir') {
      const message =
        k === 'file'
          ? 'orders-backup is a file, not a folder. A folder is copied with everything inside it.'
          : 'The top folder has no orders-backup folder yet.'
      return [check(name, false, message, listing(ws))]
    }
    const backup = join(ws, 'orders-backup')
    // A copy made into an orders-backup that already existed lands one level down; it is still a backup.
    const base = isDir(backup, 'orders') && !isDir(backup, '2026') ? join(backup, 'orders') : backup
    const missing = starterOrders.filter(
      (rel) => read(join(base, ...rel.split('/'))) !== starterText(t, `orders/${rel}`)
    )
    const output = `orders-backup:\n${filesUnder(backup).join('\n') || '(empty)'}`
    const lost = starterOrders.filter((rel) => at(ws, `orders/${rel}`) !== starterText(t, `orders/${rel}`))
    if (!missing.length && !lost.length) return [check(name, true, '', output)]
    const message = missing.length
      ? missing.length === starterOrders.length
        ? 'orders-backup has none of the files from orders yet, or they changed on the way.'
        : `orders-backup is missing part of orders: ${missing.join(', ')}. Copy the folder with everything inside it, subfolders too.`
      : !isDir(ws, 'orders')
        ? 'orders-backup is complete, but orders is gone from the top folder: that was a move. A backup is a copy, and orders stays where it was. Reset puts orders back.'
        : `orders-backup is complete, but orders has lost ${lost.join(', ')}. A backup leaves orders as it was. Reset puts the files back.`
    return [check(name, false, message, `${output}\n\norders:\n${listing(ws, 'orders')}`)]
  }
}

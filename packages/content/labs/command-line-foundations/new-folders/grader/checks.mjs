import { statSync } from 'node:fs'
import { join } from 'node:path'
import { check, isDir, kind, listing, names } from '../../grading.mjs'

/** Folders called `name` one level down from the top, to say where a misplaced one went. */
const placedIn = (ws, name) =>
  names(ws).filter((folder) => !folder.startsWith('.') && isDir(ws, folder, name))

/** A name that differs only in capital letters, or undefined. */
const otherCase = (dir, name) => names(dir).find((n) => n !== name && n.toLowerCase() === name.toLowerCase())

export const checks = {
  async receipts(t) {
    const name = 'A receipts folder in the top folder'
    const ws = t.workspace
    const k = kind(ws, 'receipts')
    const output = listing(ws)
    if (k === 'dir') return [check(name, true, '', output)]
    let message
    if (k === 'file') {
      message = 'receipts in the top folder is a file, not a folder.'
    } else if (otherCase(ws, 'receipts')) {
      message = `There is a folder ${otherCase(ws, 'receipts')}, but names care about capital letters, and the task asks for receipts in small letters.`
    } else if (placedIn(ws, 'receipts').length) {
      message = `There is a receipts folder inside ${placedIn(ws, 'receipts')[0]}, not in the top folder.`
    } else {
      message = 'The top folder has no receipts folder yet.'
    }
    return [check(name, false, message, output)]
  },

  async months(t) {
    const name = 'orders/2026 with jan, feb and mar'
    const ws = t.workspace
    if (!isDir(ws, 'orders')) {
      return [check(name, false, 'The orders folder is gone. Reset brings it back.', listing(ws))]
    }
    if (!isDir(ws, 'orders', '2026')) {
      const message =
        kind(ws, 'orders', '2026') === 'file'
          ? 'orders/2026 is a file, not a folder.'
          : isDir(ws, '2026')
            ? 'There is a 2026 folder in the top folder. It belongs inside orders.'
            : 'orders has no 2026 folder yet.'
      return [check(name, false, message, `orders:\n${listing(ws, 'orders')}`)]
    }
    const year = join(ws, 'orders', '2026')
    const output = `orders/2026:\n${listing(year)}`
    const months = ['jan', 'feb', 'mar']
    const missing = months.filter((m) => !isDir(year, m))
    if (!missing.length) return [check(name, true, '', output)]
    const first = missing[0]
    let message
    if (kind(year, first) === 'file') {
      message = `orders/2026/${first} is a file, not a folder.`
    } else if (otherCase(year, first)) {
      message = `orders/2026 has ${otherCase(year, first)}, but the task asks for ${first} in small letters.`
    } else if (isDir(ws, 'orders', first) || isDir(ws, first)) {
      message = `There is a ${first} folder, but in ${isDir(ws, first) ? 'the top folder' : 'orders'}. The months go inside orders/2026.`
    } else {
      message = `orders/2026 has no folder for ${missing.join(', ')} yet.`
    }
    return [check(name, false, message, output)]
  },

  async ideas(t) {
    const labels = ['A poster ideas folder in artwork', 'No folders from a split name']
    const ws = t.workspace
    if (!isDir(ws, 'artwork')) {
      return labels.map((n) => check(n, false, 'The artwork folder is gone. Reset brings it back.', listing(ws)))
    }
    const output = `artwork:\n${listing(ws, 'artwork')}`
    const made = kind(ws, 'artwork', 'poster ideas')
    const strays = [
      ...['poster', 'ideas'].filter((n) => isDir(ws, 'artwork', n)).map((n) => `artwork/${n}`),
      ...['poster', 'ideas'].filter((n) => isDir(ws, n))
    ]
    let message
    if (made === 'file') message = 'artwork/poster ideas is a file, not a folder.'
    else if (strays.length) {
      message = `There is no poster ideas folder, but there is ${strays.join(' and ')}: the shell split the name at the space.`
    } else if (isDir(ws, 'poster ideas')) {
      message = 'There is a poster ideas folder in the top folder. It belongs inside artwork.'
    } else message = 'artwork has no poster ideas folder yet.'
    return [
      check(labels[0], made === 'dir', message, output),
      check(
        labels[1],
        strays.length === 0,
        `${strays.join(' and ')} ${strays.length > 1 ? 'are' : 'is'} left from a name split at the space. The lesson shows how to remove an empty folder you made by mistake.`,
        strays.length ? strays.join('\n') : output
      )
    ]
  },

  async queue(t) {
    const name = 'An empty print-queue.txt in the top folder'
    const ws = t.workspace
    const k = kind(ws, 'print-queue.txt')
    const output = listing(ws)
    if (k === 'file') {
      const size = statSync(join(ws, 'print-queue.txt')).size
      return [
        check(
          name,
          size === 0,
          'print-queue.txt has something in it. The task asks for an empty file.',
          `print-queue.txt: ${size} bytes`
        )
      ]
    }
    let message
    if (k === 'dir') message = 'print-queue.txt is a folder, not a file.'
    else if (otherCase(ws, 'print-queue.txt')) {
      message = `There is ${otherCase(ws, 'print-queue.txt')}, but names care about capital letters. The task asks for print-queue.txt.`
    } else if (names(ws).includes('print-queue')) {
      message = 'There is a print-queue without .txt at the end. The ending is part of the name.'
    } else if (names(ws).some((f) => kind(ws, f, 'print-queue.txt') === 'file')) {
      message = 'There is a print-queue.txt, but inside another folder. It belongs in the top folder.'
    } else message = 'The top folder has no print-queue.txt yet.'
    return [check(name, false, message, output)]
  }
}

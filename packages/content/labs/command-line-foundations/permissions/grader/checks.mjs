// Permissions are read from the workspace's own files: the checks never copy them, so what a
// listing shows in the terminal is what the check sees.
import { join } from 'node:path'
import {
  check,
  filesUnder,
  isDir,
  isFile,
  lineDiff,
  linesOf,
  listWords,
  modeLine,
  modeOf,
  preview,
  quoted,
  starterLines,
  whoHas
} from '../../grading.mjs'

const PRICES = 'prices.csv'
const BANK = 'accounts/bank-details.txt'
const LISTS = ['prices-2023.csv', 'prices-2024.csv', 'prices-2025.csv']
const OLD_FOX = 'fox poster A3,18.00'
const NEW_FOX = 'fox poster A3,22.00'
const RESET =
  'Reset puts the starter files back as they were. If it stops at a locked file, give the file its w back first, with chmod u+w.'
const VERB = { r: 'read', w: 'change', x: 'run' }

const same = (a, b) => a.length === b.length && a.every((line, i) => line === b[i])
const cap = (text) => text[0].toUpperCase() + text.slice(1)
const has = (who) => (who.length === 1 && who[0] !== 'others' ? 'has' : 'have')
const at = (t, rel) => join(t.workspace, ...rel.split('/'))
const ownerHas = (mode, letter) => whoHas(mode, letter).includes('the owner')

/** What the owner can no longer do with a file, as a message, or null when they can do both. */
function ownerLost(rel, mode, letters) {
  const lost = [...letters].filter((l) => !ownerHas(mode, l))
  if (!lost.length) return null
  if (lost.includes('r')) {
    return `Nobody may read ${rel} now, you included: its owner has no r. chmod u+r ${rel} gives it back.`
  }
  return `You may no longer change ${rel} yourself: its owner has no w.`
}

/** Files outside the tasks whose permissions match `test`, to name the wrong file when one was changed. */
const changedElsewhere = (t, skip, test) =>
  filesUnder(t.workspace).filter(
    (rel) => !skip.some((s) => rel === s || rel.startsWith(`${s}/`)) && test(modeOf(at(t, rel)))
  )

/** Who still has w on a file that should be locked, in a sentence. */
const stillChange = (rel, writers) =>
  `${cap(listWords(writers))} can still change ${rel}: ${writers.length === 1 ? 'it' : 'each'} still has w.`

export const checks = {
  async lock(t) {
    const name = 'prices.csv is locked, and everyone may read it'
    if (!isFile(t.workspace, PRICES)) {
      return [check(name, false, `prices.csv is gone from the top folder. ${RESET}`, '')]
    }
    const mode = modeOf(at(t, PRICES))
    const output = modeLine(t.workspace, PRICES)
    const fail = (message) => [check(name, false, message, output)]
    const lost = ownerLost(PRICES, mode, 'r')
    if (lost) return fail(lost)
    const writers = whoHas(mode, 'w')
    if (writers.length) {
      const other = changedElsewhere(t, [PRICES, 'archive'], (m) => !ownerHas(m, 'w'))
      const note = other.length
        ? ` ${other[0]} is locked now, but this task is about prices.csv in the top folder.`
        : ''
      return fail(stillChange(PRICES, writers) + note)
    }
    const unread = ['the owner', 'the group', 'others'].filter((w) => !whoHas(mode, 'r').includes(w))
    if (unread.length) {
      return fail(
        `Nobody can change prices.csv now, but ${listWords(unread)} cannot read it. Idris wants everyone to read it: give ${unread.length === 1 && unread[0] !== 'others' ? 'it' : 'them'} r as well.`
      )
    }
    const runners = whoHas(mode, 'x')
    if (runners.length) {
      return fail(
        `prices.csv is locked, but ${listWords(runners)} may run it too now (x). It is a list, not a program.`
      )
    }
    return [check(name, true, '', output)]
  },

  async private(t) {
    const name = 'Only you may read and change bank-details.txt'
    const folderMode = modeOf(at(t, 'accounts'))
    const shut = folderMode === null ? [] : ['r', 'x'].filter((l) => !ownerHas(folderMode, l))
    if (shut.length) {
      return [
        check(
          name,
          false,
          `You may no longer ${shut.includes('x') ? 'open' : 'list'} the accounts folder: its owner has no ${listWords(shut)}, so nothing in it can be reached. chmod u+rwx accounts gives it back. This task changes the file in the folder, not the folder.`,
          modeLine(t.workspace, 'accounts')
        )
      ]
    }
    if (!isFile(t.workspace, ...BANK.split('/'))) {
      return [check(name, false, `${BANK} is gone. ${RESET}`, '')]
    }
    const mode = modeOf(at(t, BANK))
    const output = modeLine(t.workspace, BANK)
    const fail = (message) => [check(name, false, message, output)]
    const lost = ownerLost(BANK, mode, 'rw')
    if (lost) return fail(`${lost} Only you may read and change it, so the owner keeps r and w.`)
    const left = ['the group', 'others']
      .map((who) => [who, ['r', 'w', 'x'].filter((l) => whoHas(mode, l).includes(who))])
      .filter(([, letters]) => letters.length)
    if (left.length) {
      const verbs = (letters) => listWords(letters.map((l) => VERB[l]))
      const said =
        left.length === 2 && verbs(left[0][1]) === verbs(left[1][1])
          ? `The group and others may still ${verbs(left[0][1])} ${BANK}.`
          : left
              .map(([who, letters], i) => `${cap(who)} may still ${verbs(letters)} ${i ? 'it' : BANK}.`)
              .join(' ')
      const other = changedElsewhere(t, [BANK, PRICES, 'archive'], (m) => !whoHas(m, 'r').includes('others'))
      const folderClosed = folderMode !== null && !whoHas(folderMode, 'r').includes('others')
      const note = other.length
        ? ` ${other[0]} is private now, but this task is about ${BANK}.`
        : folderClosed
          ? ` The accounts folder itself is closed now, but this task is about the file in it.`
          : ''
      return fail(`${said} Nobody but you may read, change or run it.${note}`)
    }
    return [check(name, true, '', output)]
  },

  async archive(t) {
    const name = 'Every old price list is locked, and the archive folder stays open'
    const ws = t.workspace
    const rels = LISTS.map((n) => `archive/${n}`)
    const output = ['archive', ...rels].map((rel) => modeLine(ws, rel)).join('\n')
    const fail = (message) => [check(name, false, message, output)]
    if (!isDir(ws, 'archive')) {
      return [check(name, false, `The archive folder is gone. ${RESET}`, '')]
    }
    const dirMode = modeOf(at(t, 'archive'))
    const shut = ['r', 'x'].filter((l) => !ownerHas(dirMode, l))
    if (shut.length) {
      return fail(
        `You may no longer ${shut.includes('x') ? 'open' : 'list'} the archive folder: its owner has no ${listWords(shut)}. chmod u+rwx archive gives them back. Locking the files inside leaves the folder's own r and x alone.`
      )
    }
    const gone = rels.filter((rel) => !isFile(ws, ...rel.split('/')))
    if (gone.length) return fail(`${gone[0]} is gone. ${RESET}`)
    const modes = rels.map((rel) => modeOf(at(t, rel)))
    const unreadable = rels.find((rel, i) => !ownerHas(modes[i], 'r'))
    if (unreadable) {
      return fail(
        `Nobody may read ${unreadable} now, you included: its owner has no r. chmod u+r ${unreadable} gives it back. Locking takes away w and leaves r alone.`
      )
    }
    const open = rels.filter((rel, i) => whoHas(modes[i], 'w').length)
    const folderLocked = !ownerHas(dirMode, 'w')
    if (folderLocked && open.length === rels.length) {
      return fail(
        "The archive folder is locked, but the price lists inside are not: each can still be changed. A folder's w decides what may be added to it or removed from it. Each file's own w decides whether the file may be changed."
      )
    }
    if (open.length) {
      const i = rels.indexOf(open[0])
      return fail(
        `${open.length} of the 3 price lists in archive can still be changed, such as ${open[0]}: ${listWords(whoHas(modes[i], 'w'))} still ${has(whoHas(modes[i], 'w'))} w.`
      )
    }
    if (folderLocked) {
      return fail(
        "The price lists are locked, but so is the archive folder itself: its owner has no w, so next year's list cannot go in. Give the folder its owner's w back, and leave the files locked."
      )
    }
    const unread = rels.find((rel, i) => whoHas(modes[i], 'r').length < 3)
    if (unread) {
      return fail(
        `Nobody can change the price lists now, but not everyone may read ${unread}. Lock them the way prices.csv is locked: everyone may still read them, so give them r as well.`
      )
    }
    const runnable = rels.find((rel, i) => whoHas(modes[i], 'x').length)
    if (runnable) {
      return fail(`${runnable} may be run now (x). It is a list, not a program.`)
    }
    return [check(name, true, '', output)]
  },

  async update(t) {
    const name = 'The fox poster has its new price, and prices.csv is locked again'
    if (!isFile(t.workspace, PRICES)) {
      return [check(name, false, `prices.csv is gone from the top folder. ${RESET}`, '')]
    }
    const mode = modeOf(at(t, PRICES))
    const lost = ownerLost(PRICES, mode, 'r')
    if (lost) return [check(name, false, lost, modeLine(t.workspace, PRICES))]
    const lines = linesOf(at(t, PRICES))
    const output = `${modeLine(t.workspace, PRICES)}\n\n${preview(PRICES, lines, 12)}`
    const fail = (message) => [check(name, false, message, output)]
    const start = starterLines(t, PRICES)
    const want = start.map((line) => (line === OLD_FOX ? NEW_FOX : line))
    const writers = whoHas(mode, 'w')
    if (same(lines, want)) {
      if (writers.length) {
        return fail(
          `The new price is in, but ${listWords(writers)} can change prices.csv again. Lock it again, the way the first task asks.`
        )
      }
      return [check(name, true, '', output)]
    }
    if (same(lines, start)) {
      return fail(
        writers.length
          ? 'prices.csv still has the fox poster at its old price.'
          : 'prices.csv still has the fox poster at its old price. It is locked, so it has to be made changeable first, and locked again after.'
      )
    }
    if (!lines.length) return fail(`prices.csv is empty. ${RESET}`)
    const fox = lines.filter((line) => line.startsWith('fox poster'))
    if (fox.length > 1) {
      return fail(
        `prices.csv has the fox poster on ${fox.length} lines. Change the line that is there, instead of adding another.`
      )
    }
    if (!fox.length) return fail('prices.csv has no line for the fox poster any more.')
    if (fox[0] !== NEW_FOX) {
      return fail(
        `The fox poster's line is ${quoted(fox[0])}. Write it exactly as today.txt does, the price included.`
      )
    }
    const { missing, extra } = lineDiff(lines, want)
    if (missing.length >= want.length - 1) {
      return fail(
        `The fox poster's line is the only one of the list left: > replaced the whole file. ${RESET}`
      )
    }
    if (missing.length || extra.length) {
      return fail(
        `The fox poster's price is right, but ${missing.length || extra.length} other line${(missing.length || extra.length) === 1 ? ' is not as it was' : 's are not as they were'}. Only the fox poster's line changes. ${RESET}`
      )
    }
    return fail('Every line is there, but not in the order they had. Only the fox poster\'s line changes.')
  }
}

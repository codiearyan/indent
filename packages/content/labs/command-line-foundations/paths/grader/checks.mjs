import { spawnSync } from 'node:child_process'
import { join, relative, resolve, sep } from 'node:path'
import { check, expandHome, missingAnswer, readNotes, real } from '../../grading.mjs'

const KEYS = ['inside', 'back', 'proofs']
const PROOFS = 'client proofs'

const shown = (ws, path) => relative(ws, path).split(sep).join('/') || 'the top folder'

export const checks = {
  async inside(t) {
    const name = 'Where pwd says you are in autumn'
    const notes = readNotes(t, KEYS)
    const missing = missingAnswer(name, notes, 'inside')
    if (missing) return [missing]
    const value = notes.inside
    const output = `inside: ${value}`
    const ws = real(t.workspace)
    const target = real(join(t.workspace, 'archive', '2025', 'autumn'))
    if (!target) {
      return [check(name, false, 'archive/2025/autumn is gone from the workspace. Reset brings it back.', output)]
    }
    const path = expandHome(value)
    if (!path.startsWith('/')) {
      return [
        check(
          name,
          false,
          'pwd prints a full path, starting with / at the top of the computer. Go into the folder, run pwd there and copy the whole line.',
          output
        )
      ]
    }
    const answer = real(path)
    if (answer === target) return [check(name, true, '', output)]
    let message
    if (answer === null) {
      message = 'No folder exists at that path, so a letter or a slash is off. Copy the line pwd prints exactly.'
    } else if (answer === ws) {
      message =
        'That is the folder the terminal starts in. Move into archive/2025/autumn first, then run pwd.'
    } else if (answer.startsWith(ws + sep)) {
      message = `That is the path of ${shown(ws, answer)}, not of archive/2025/autumn.`
    } else {
      message = 'That path is outside the workspace of this issue. Start from the folder the terminal opens in.'
    }
    return [check(name, false, message, output)]
  },

  async back(t) {
    const name = 'A path from orders to invoices/march'
    const notes = readNotes(t, KEYS)
    const missing = missingAnswer(name, notes, 'back')
    if (missing) return [missing]
    const value = notes.back
    const output = `back: ${value}`
    const ws = real(t.workspace)
    const from = join(t.workspace, 'orders')
    const target = real(join(t.workspace, 'invoices', 'march'))
    if (!real(from) || !target) {
      return [check(name, false, 'orders or invoices/march is gone from the workspace. Reset brings them back.', output)]
    }
    if (/^(cd|ls)\s/.test(value)) {
      return [check(name, false, 'Write only the path, without a command in front of it.', output)]
    }
    if (value.startsWith('/') || value.startsWith('~')) {
      return [
        check(
          name,
          false,
          'That path starts at the top of the computer or at your home folder. The path must start from orders, where Idris already is.',
          output
        )
      ]
    }
    const answer = real(resolve(from, value))
    if (answer === target) return [check(name, true, '', output)]
    let message
    if (answer === null && real(resolve(t.workspace, value)) === target) {
      message =
        'That path works from the top folder, but Idris is inside orders, and orders has no invoices folder in it.'
    } else if (answer === null) {
      message = 'From orders, that path leads nowhere: one of the folders on the way does not exist there.'
    } else if (answer === ws || answer.startsWith(ws + sep)) {
      message = `From orders, that path leads to ${shown(ws, answer)}, not to invoices/march.`
    } else {
      message = 'From orders, that path climbs out of the workspace altogether. Count how many levels up you need.'
    }
    return [check(name, false, message, output)]
  },

  async proofs(t) {
    const name = 'A cd that reaches client proofs'
    const notes = readNotes(t, KEYS)
    const missing = missingAnswer(name, notes, 'proofs')
    if (missing) return [missing]
    const line = notes.proofs
    const output = `proofs: ${line}`
    const target = real(join(t.workspace, PROOFS))
    if (!target) {
      return [check(name, false, `The folder ${PROOFS} is gone from the workspace. Reset brings it back.`, output)]
    }
    if (!/^cd\s/.test(line)) {
      return [check(name, false, 'Write the whole command you typed, starting with cd and a space.', output)]
    }
    // The line runs in a real shell below, so it may only be a cd with a path: nothing that chains,
    // redirects or substitutes.
    if (/[;&|<>$`(){}\n]/.test(line)) {
      return [check(name, false, 'Write one cd command with the folder\'s name, and nothing after it.', output)]
    }
    const arg = line.slice(2).trim()
    if (/\s/.test(arg) && !/['"\\]/.test(arg)) {
      return [
        check(
          name,
          false,
          'Without quotes, the shell splits the name at the space, so cd gets two words instead of one folder name.',
          output
        )
      ]
    }
    const run = spawnSync('/bin/sh', ['-c', `${line} && pwd -P`], { cwd: t.workspace, encoding: 'utf8' })
    const ended = run.status === 0 ? run.stdout.trim() : null
    if (ended && real(ended) === target) return [check(name, true, '', output)]
    const message = ended
      ? `That command ends in ${shown(real(t.workspace), real(ended))}, not in ${PROOFS}.`
      : 'Run from the top folder, that command does not reach any folder: check every letter, space and quote.'
    return [check(name, false, message, `${output}\n${run.stderr.trim()}`.trim())]
  }
}

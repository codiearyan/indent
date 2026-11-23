// shop-settings.sh stands in for a startup file. Checks load it with sh in a fresh copy of the
// workspace, with the copy as the working folder and as home and a small environment, and read
// what it leaves behind. They never touch the learner's own startup files.
import { mkdirSync, statSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
import {
  changedNote,
  check,
  crlfMessage,
  isFile,
  lineDiff,
  linesOf,
  modeLine,
  modeOf,
  noted,
  preview,
  printed,
  quoted,
  real,
  runScript,
  saved,
  scriptEnv,
  starterLines,
  starterText,
  topFile,
  whoHas,
  withSandbox
} from '../../grading.mjs'

const SETTINGS = 'shop-settings.sh'
const NAME = 'Ashgrove Press'
const RESET = 'Reset puts the starter files back as they were.'
const BASE = scriptEnv('').PATH.split(':')

const same = (a, b) => a.length === b.length && a.every((line, i) => line === b[i])
const runnable = (path) => whoHas(modeOf(path) ?? 0, 'x').includes('the owner')

/** A file someone may run, as the shell needs it to be to find it on PATH. */
function isProgram(path) {
  try {
    const s = statSync(path)
    return s.isFile() && (s.mode & 0o111) !== 0
  } catch {
    return false
  }
}

/** shop-settings.sh with every line it started with, or the one detail that says what is wrong. */
function settings(t, name) {
  const found = topFile(t, name, SETTINGS)
  if (found.failed) {
    return isFile(t.workspace, SETTINGS)
      ? found
      : { failed: check(name, false, `${SETTINGS} is gone from the top folder. ${RESET}`, '') }
  }
  if (found.text.includes('\r')) return { failed: check(name, false, crlfMessage(SETTINGS), '') }
  const lines = linesOf(found.path)
  const start = starterLines(t, SETTINGS).filter(Boolean)
  const { missing } = lineDiff(
    lines.filter((line) => start.includes(line)),
    start
  )
  if (missing.length) {
    const message =
      missing.length === start.length
        ? `The lines ${SETTINGS} started with are gone: > replaces a whole file, and >> adds to its end. ${RESET} Your own lines go after them.`
        : `${missing.length} of the lines ${SETTINGS} started with ${missing.length === 1 ? 'is' : 'are'} gone or changed. Keep every line it has, and add yours after them. ${RESET}`
    return { failed: check(name, false, message, preview(SETTINGS, lines, 8)) }
  }
  return found
}

/** Loads shop-settings.sh with sh in `cwd`, then runs `after` in the same shell. */
async function load(dir, cwd, after) {
  mkdirSync(cwd, { recursive: true })
  const r = await runScript('/bin/sh', ['-c', `. "$1"\nprintf '\\n__LOADED__\\n'\n${after}`, 'sh', join(dir, SETTINGS)], {
    cwd,
    env: scriptEnv(dir)
  })
  const [, rest] = r.stdout.split('\n__LOADED__\n')
  const stderr = r.stderr.split(join(dir, SETTINGS)).join(SETTINGS)
  return { ...r, stderr, loaded: rest !== undefined, rest: rest ?? '' }
}

const loadFailed = (r) =>
  r.timedOut
    ? `Loading ${SETTINGS} did not finish within a few seconds. A line in it may be waiting for something.`
    : `Loading ${SETTINGS} stopped with an error${r.stderr.trim() ? `: ${quoted(r.stderr.trim().split('\n')[0])}` : '.'}`

/** Where each PATH entry points, read the way the shell reads it from `cwd`. */
function entries(path, cwd, dir) {
  return path.split(':').map((entry) => {
    const at = entry === '' ? cwd : isAbsolute(entry) ? entry : resolve(cwd, entry)
    // The copy is home while the file loads, so a $HOME path points into it; the learner meant their own home.
    const home = at === dir || at.startsWith(`${dir}/`) ? homedir() + at.slice(dir.length) : null
    return { entry, places: home ? [at, home] : [at] }
  })
}

const holds = (places, tool, test) => places.some((p) => test(join(p, tool)))

export const checks = {
  async home(t) {
    const name = 'home.txt holds your home folder'
    const file = 'home.txt'
    const got = saved(t, name, file)
    if (got.failed) {
      return [noted(got.failed, isFile(t.workspace, file) ? ' The name of a variable is written in capitals, as the lesson shows.' : '')]
    }
    const { lines } = got
    const output = preview(file, lines)
    const fail = (message) => [check(name, false, message, output)]
    if (lines.length > 1) return fail(`home.txt has ${lines.length} lines. echo prints one line here.`)
    const line = lines[0]
    if (real(line) && real(line) === real(homedir())) return [check(name, true, '', output)]
    if (line === 'HOME') {
      return fail('home.txt holds the word HOME. A $ in front of a name makes the shell put in its value.')
    }
    if (line.includes('$')) {
      return fail(
        `home.txt holds ${quoted(line)} as it was typed. Inside single quotes, or after a backslash, the shell leaves $ alone.`
      )
    }
    if (real(line) && real(line) === real(t.workspace)) {
      return fail('That is the folder you are in, the top folder, not your home folder.')
    }
    if (line.startsWith('/')) return fail(`${quoted(line)} is not your home folder.`)
    return fail(`home.txt holds ${quoted(line)}, which is not the full path of a folder.`)
  },

  async label(t) {
    const name = "label.txt holds the label, with the shop's name"
    const file = 'label.txt'
    const got = saved(t, name, file)
    if (got.failed) return [got.failed]
    const { lines } = got
    const output = preview(file, lines)
    const fail = (message) => [check(name, false, message + changedNote(t, 'label.sh'), output)]
    const want = await runScript('/bin/sh', [t.chapterPath('starter/label.sh')], {
      cwd: tmpdir(),
      env: scriptEnv(tmpdir(), { SHOP_NAME: NAME })
    })
    if (same(lines, printed(want.stdout))) {
      return [check(name, true, '', output)]
    }
    const from = lines.find((line) => line.startsWith('From:'))
    if (from === undefined) {
      return fail(
        lines.includes(NAME)
          ? 'label.txt has the name, but not the label. It should hold what label.sh prints.'
          : 'label.txt does not hold what label.sh prints.'
      )
    }
    const shop = from.slice('From:'.length).trim()
    if (shop === '') {
      return fail(
        'The label in label.txt has no name after From:, so label.sh did not see SHOP_NAME. Either it was not set in that terminal, or it was set but not exported, and a program started from the shell gets only exported variables.'
      )
    }
    if (shop === 'Ashgrove') {
      return fail(
        'The name on the label is only Ashgrove. A value with a space needs quotes around it, or the shell stops at the space.'
      )
    }
    if (shop !== NAME) {
      return fail(`The name on the label is ${quoted(shop)}. Idris wants the shop's name exactly as today.txt writes it.`)
    }
    return fail('The From line is right, but the other lines are not what label.sh prints. Save all of what it prints, and nothing else.')
  },

  async stamp(t) {
    const name = 'stamp runs by its name from any folder once shop-settings.sh is loaded'
    if (!isFile(t.workspace, 'bin', 'stamp')) return [check(name, false, `bin/stamp is gone. ${RESET}`, '')]
    if (!runnable(join(t.workspace, 'bin', 'stamp'))) {
      return [
        check(name, false, 'bin/stamp is not runnable yet: its owner has no x.', modeLine(t.workspace, 'bin/stamp'))
      ]
    }
    const found = settings(t, name)
    if (found.failed) return [found.failed]
    return withSandbox(t, name, async (dir) => {
      const tools = [real(join(t.workspace, 'bin', 'stamp')), real(join(dir, 'bin', 'stamp'))]
      const isStamp = (p) => tools.includes(real(p)) && runnable(p)
      const look = async (cwd) => {
        const r = await load(dir, cwd, 'printf "%s" "$PATH"')
        const list = entries(r.rest, cwd, dir)
        return {
          r,
          list,
          stamp: list.some(({ places }) => holds(places, 'stamp', isStamp)),
          ls: list.some(({ places }) => holds(places, 'ls', isProgram))
        }
      }
      const away = await look(join(dir, 'elsewhere'))
      const output = [
        'PATH after loading the file in another folder:',
        ...(away.r.rest ? away.r.rest.split(':') : ['(empty)']),
        away.r.stderr.trim()
      ]
        .filter(Boolean)
        .join('\n')
      const fail = (message) => [check(name, false, message, output)]
      if (!away.r.loaded) return fail(loadFailed(away.r))
      if (!away.ls) {
        return fail(
          'After loading shop-settings.sh, even ls cannot be found: PATH holds only what the line put there, and every folder that was on it is gone. Add the bin folder to PATH and keep what was there.'
        )
      }
      const lost = BASE.filter((folder) => !away.list.some(({ entry }) => entry === folder))
      if (lost.length) {
        return fail(
          `After loading shop-settings.sh, PATH has lost ${lost.join(' and ')}, which ${lost.length === 1 ? 'was' : 'were'} on it before. Add the bin folder and keep every folder that was there.`
        )
      }
      if (away.stamp) return [check(name, true, '', output)]
      const top = await look(dir)
      if (top.r.loaded && top.stamp) {
        return fail(
          'stamp is found when the shell starts in the top folder, but not in any other folder. A startup file is read wherever a shell starts, so PATH needs the full path of the bin folder.'
        )
      }
      const added = away.list.filter(({ entry }) => !BASE.includes(entry))
      const tilde = added.find(({ entry }) => entry.startsWith('~'))
      if (tilde) {
        return fail(
          `PATH now has ${quoted(tilde.entry)}. A ~ inside quotes stays a ~, and the shell does not read it as your home folder there. Write the full path.`
        )
      }
      const elsewhere = added.find(({ places }) => places.some((p) => real(p) !== null))
      if (elsewhere) {
        return fail(`PATH now has ${quoted(elsewhere.entry)}, but stamp is not in that folder. It is in bin, inside the top folder.`)
      }
      if (added.length) {
        return fail(`PATH now has ${quoted(added[0].entry)}, which is not a folder on this computer. Compare it, letter by letter, with what pwd prints.`)
      }
      return fail(
        `After loading ${SETTINGS}, PATH is the same as before: no line in it adds the bin folder.${away.r.stderr.trim() ? ` Loading it printed an error: ${quoted(away.r.stderr.trim().split('\n')[0])}` : ''}`
      )
    })
  },

  async lasting(t) {
    const name = 'SHOP_NAME reaches every program once shop-settings.sh is loaded'
    const found = settings(t, name)
    if (found.failed) return [found.failed]
    return withSandbox(t, name, async (dir) => {
      const label = join(dir, 'check-label.sh')
      writeFileSync(label, starterText(t, 'label.sh'))
      const r = await load(
        dir,
        join(dir, 'elsewhere'),
        `printf '__SET__%s\\n' "\${SHOP_NAME-__UNSET__}"\n/bin/sh "${label}"`
      )
      const set = r.rest.match(/^__SET__(.*)$/m)?.[1]
      const shop = r.rest.match(/^From:(.*)$/m)?.[1].trim()
      const printedLabel = r.rest.replace(/^__SET__.*\n/m, '').trim()
      const output = [
        preview(SETTINGS, linesOf(found.path), 8),
        `label.sh, after loading it:\n${[printedLabel, r.stderr.trim()].filter(Boolean).join('\n') || '(nothing)'}`
      ].join('\n\n')
      const fail = (message) => [check(name, false, message, output)]
      if (!r.loaded || set === undefined) return fail(loadFailed(r))
      if (shop === NAME) return [check(name, true, '', output)]
      if (set === '__UNSET__') {
        const error = r.stderr.trim().split('\n')[0]
        return fail(
          `After loading ${SETTINGS}, SHOP_NAME is not set: no line in it sets the name.${error ? ` Loading it printed an error: ${quoted(error)}` : ''}`
        )
      }
      if (set === NAME) {
        return fail(
          `${SETTINGS} sets SHOP_NAME, but label.sh, started after it, does not see it: the variable is set and not exported.`
        )
      }
      if (set === 'Ashgrove') {
        return fail('After loading the file, SHOP_NAME is only Ashgrove. A value with a space needs quotes around it, or the shell stops at the space.')
      }
      return fail(`After loading the file, SHOP_NAME is ${quoted(set)}. Idris wants the shop's name exactly as today.txt writes it.`)
    })
  }
}

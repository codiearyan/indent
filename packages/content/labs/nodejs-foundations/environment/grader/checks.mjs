import { box, broken, errorLine, fail, hasStack, lines, pass, reports, run } from '../../grading.mjs'

// Every run sets these itself, so a setting in the terminal that started Check cannot leak in.
const NONE = { WATER_PRICE: undefined, LEAK_LITRES: undefined, WATER_KEY: undefined }
const KEY = 'Q7rT2vLx9Wd3Hs'

const bill = (dir, litres, settings) => run(dir, 'water-bill.js', [String(litres)], { env: { ...NONE, ...settings } })
const cost = (litres, price) => `${litres} litres cost ${((litres / 1000) * price).toFixed(2)}.`
const out = (r) => lines(r.stdout).map((l) => l.trim())
const err = (r) => lines(r.stderr).filter((l) => l.trim() !== '')

/** Why a run that should print the bill did not, in words, or null. */
function billTrouble(r, litres, price) {
  const got = out(r)
  const wanted = cost(litres, price)
  if (got.length === 1 && got[0] === wanted) {
    return r.code === 0 ? null : `With WATER_PRICE=${price}, the bill is right but the script ended with exit code ${r.code}. A bill that was printed ends with 0.`
  }
  const setting = `WATER_PRICE=${price}`
  if (hasStack(r.stderr)) return `With ${setting}, water-bill.js stopped with an error: ${errorLine(r.stderr) ?? 'see the output'}.`
  if (got.some((l) => l.includes('NaN'))) return `With ${setting}, the cost came out as NaN. Look at what you turn into a number: the setting, or the litres typed.`
  if (got.length === 0 && r.code === 1 && err(r).some((l) => l.includes('WATER_PRICE') && /not set|missing|undefined/i.test(l))) {
    return `With ${setting}, the script refused the price as if it were not set. Compare the name you read from process.env with WATER_PRICE, letter by letter: the case of the letters counts.`
  }
  if (got.length === 0) return `With ${setting}, nothing went to standard output. Print the line with the cost there.`
  if (got.length > 1) return `With ${setting}, standard output had more than one line. Only the line with the cost goes there.`
  const number = /cost (-?\d+(?:\.\d+)?)/.exec(got[0])?.[1]
  if (number === ((litres / 1000) * 2.1).toFixed(2)) {
    return `With ${setting}, the cost was worked out at 2.10, the price in the task's example. Read the price from WATER_PRICE each time the script runs.`
  }
  if (number === (litres * price).toFixed(2)) return `With ${setting}, the cost is a thousand times too big. The price is for 1000 litres.`
  if (number && Number(number) === Number(((litres / 1000) * price).toFixed(2))) {
    return `With ${setting}, the cost is right but not written with two figures after the point, as in issue 1.`
  }
  if (number !== undefined) return `With ${setting} and ${litres} litres, the cost is not right. The price is for 1000 litres.`
  return `With ${setting}, the line should read like the task's example, word for word, with the litres and the cost.`
}

/** Why a run that should refuse a setting did not, in words, or null. */
function refusalTrouble(r, name, value) {
  const how = value === undefined ? `With no ${name} set` : `With ${name}=${value === '' ? ' (empty)' : value}`
  const said = err(r)
  if (hasStack(r.stderr)) {
    return `${how}, water-bill.js stopped with an error: ${errorLine(r.stderr) ?? 'see the output'}. Check the setting yourself and print one plain line.`
  }
  if (out(r).length > 0) {
    const shown = out(r).join(' ')
    if (/NaN/.test(shown)) return `${how}, the bill came out as NaN. A setting that is missing or not a number is refused before anything is worked out.`
    if (value === '' && /cost 0\.00/.test(shown)) {
      return `${how}, the bill came out as 0.00: Number turns empty text into 0. Treat an empty setting as one that is not set.`
    }
    if (value === '1,80') {
      return `${how}, the script still printed a bill. A comma is not a decimal point, so this is not a number; a way of reading that stops at the comma takes it for 1.`
    }
    if (/^-/.test(value ?? '')) return `${how}, the script printed a bill. A price below 0 is not a price.`
    return `${how}, something went to standard output. When a setting is refused, nothing goes there.`
  }
  if (said.length !== 1) return `${how}, print exactly one line on standard error.`
  if (!said[0].includes(name)) return `${how}, the line on standard error should name ${name}, so the person knows which setting to fix.`
  if (r.code !== 1) return `${how}, the script ended with exit code ${r.code}. A refused setting ends with exit code 1.`
  return null
}

/** Runs water-bill.js for each [litres, settings], and stops at the first run that went wrong the same way in every task. */
async function bills(name, dir, cases) {
  const runs = []
  for (const [litres, settings] of cases) {
    const r = await bill(dir, litres, settings)
    const found = await broken(name, r, dir, 'water-bill.js')
    if (found) return { stop: found }
    runs.push(r)
  }
  return { runs }
}

const SHOWN = ['WATER_PRICE', 'LEAK_LITRES', 'WATER_KEY']

export const checks = {
  async price(t) {
    const dir = await box(t)
    const name = 'The bill uses the price in WATER_PRICE'
    const { stop, runs } = await bills(name, dir, [[3600, { WATER_PRICE: '1.75' }], [850, { WATER_PRICE: '3.2' }]])
    if (stop) return [stop]
    const [a, b] = runs
    const m1 = billTrouble(a, 3600, 1.75) ?? billTrouble(b, 850, 3.2)
    const results = [m1 ? fail(name, m1, reports(a, b)) : pass(name, reports(a, b))]

    const none = await bill(dir, 3600, {})
    const name2 = 'With no WATER_PRICE set, one line on standard error and exit code 1'
    const m2 = refusalTrouble(none, 'WATER_PRICE', undefined)
    results.push(m2 ? fail(name2, m2, reports(none)) : pass(name2, reports(none)))
    return results
  },

  async number(t) {
    const dir = await box(t)
    const name = 'A WATER_PRICE that is not a number above 0 is refused'
    const values = ['two', '1,80', '', '-1.5']
    const { stop, runs } = await bills(name, dir, values.map((value) => [2000, { WATER_PRICE: value }]))
    if (stop) return [stop]
    let message = null
    for (const [i, value] of values.entries()) {
      message = refusalTrouble(runs[i], 'WATER_PRICE', value)
      if (message) break
    }
    const results = [message ? fail(name, message, reports(...runs)) : pass(name, reports(...runs))]

    const good = await bill(dir, 2600, { WATER_PRICE: '0.95' })
    const name2 = 'A good price, WATER_PRICE=0.95, still gives the bill'
    const m2 = billTrouble(good, 2600, 0.95)
    results.push(m2 ? fail(name2, m2, reports(good)) : pass(name2, reports(good)))
    return results
  },

  async default(t) {
    const dir = await box(t)
    const price = { WATER_PRICE: '2' }
    // [litres, LEAK_LITRES, warned]
    const unset = [[4800, undefined, false], [5200, undefined, true], [5000, undefined, false], [4800, '', false]]
    const set = [[2000, '1500', true], [900, '1500', false], [1400, '1500', false]]
    const cases = [...unset, ...set].map(([litres, leak]) => [litres, { ...price, LEAK_LITRES: leak }])
    const { stop, runs } = await bills('water-bill.js warns about a leak', dir, cases)
    if (stop) return [stop]
    const unsetRuns = runs.slice(0, unset.length)
    const setRuns = runs.slice(unset.length)

    const judge = (cases, runs) => {
      for (const [i, [litres, leak, warned]] of cases.entries()) {
        const r = runs[i]
        const how = leak === undefined ? `With LEAK_LITRES not set and ${litres} litres` : leak === '' ? `With LEAK_LITRES empty and ${litres} litres` : `With LEAK_LITRES=${leak} and ${litres} litres`
        const trouble = billTrouble(r, litres, 2)
        if (trouble && out(r).join('\n') === cost(litres, 2)) {
          return `${how}, the script ended with exit code ${r.code}. A warning is not a failure: the bill was printed, so it ends with 0.`
        }
        if (trouble) {
          if (out(r).some((l) => /leak/i.test(l))) return `${how}, the warning went to standard output. It belongs on standard error, so the bill stays alone on standard output.`
          if (r.code === 1 && leak === '') return `${how}, the script refused to run. An empty setting counts as not set, so the limit is the default.`
          return trouble
        }
        const said = err(r)
        if (warned && said.length === 0) {
          return leak === undefined
            ? `${how}, there was no warning. When LEAK_LITRES is not set, the limit is the default from the task.`
            : `${how}, there was no warning. The limit comes from LEAK_LITRES when it is set.`
        }
        if (warned && said.length > 1) return `${how}, print one line of warning on standard error, not ${said.length}.`
        if (!warned && said.length > 0) {
          if (litres === 5000) return `${how}, there was a warning. At exactly the limit there is none: only more than it.`
          if (leak === '') return `${how}, there was a warning, as if the limit were 0. An empty setting counts as not set: use the default.`
          if (litres === 900) return `${how}, there was a warning. 900 is less than 1500, but as text "900" comes after "1500". Compare numbers, not text.`
          return `${how}, there was a warning, but the litres are not more than the limit.`
        }
      }
      return null
    }
    const results = []
    const n1 = 'With LEAK_LITRES not set or empty, more than 5000 litres gets a warning'
    const m1 = judge(unset, unsetRuns)
    results.push(m1 ? fail(n1, m1, reports(...unsetRuns)) : pass(n1, reports(...unsetRuns)))
    const n2 = 'LEAK_LITRES=1500 moves the limit'
    const m2 = judge(set, setRuns)
    results.push(m2 ? fail(n2, m2, reports(...setRuns)) : pass(n2, reports(...setRuns)))

    const bad = await bill(dir, 100, { ...price, LEAK_LITRES: 'lots' })
    const n3 = 'A LEAK_LITRES that is not a number is refused'
    const m3 = refusalTrouble(bad, 'LEAK_LITRES', 'lots')
    results.push(m3 ? fail(n3, m3, reports(bad)) : pass(n3, reports(bad)))
    return results
  },

  async secret(t) {
    const dir = await box(t)
    const all = await run(dir, 'settings.js', [], { env: { ...NONE, WATER_PRICE: '1.95', LEAK_LITRES: '2500', WATER_KEY: KEY } })
    const none = await run(dir, 'settings.js', [], { env: { ...NONE } })
    for (const r of [all, none]) {
      const found = await broken('settings.js shows the settings', r, dir, 'settings.js')
      if (found) return [found]
    }
    // The key is shown as "set" in the command Check prints, never as itself.
    const shownRuns = (...runs) => reports(...runs).split(KEY).join('(the key)')
    const results = []

    const leakName = 'The key never shows, not even a part of it'
    const printed = all.stdout + all.stderr
    const pieces = Array.from({ length: KEY.length - 2 }, (_, i) => KEY.slice(i, i + 3))
    let leak = null
    if (printed.includes(KEY)) {
      leak = /PATH|HOME|USERPROFILE|SystemRoot/i.test(printed)
        ? 'settings.js printed every setting in the environment, and the key with them. Print only the settings the water scripts use, and for the key only whether it is set.'
        : 'The value of WATER_KEY showed up in what settings.js printed. A secret is never printed: say only whether it is set.'
    } else if (pieces.some((p) => printed.includes(p))) {
      leak = 'Part of the value of WATER_KEY showed up in what settings.js printed. Even a few letters of a secret help someone guess it: say only whether it is set.'
    }
    results.push(leak ? fail(leakName, leak, shownRuns(all)) : pass(leakName, shownRuns(all)))

    const judge = (r, wanted, how) => {
      if (hasStack(r.stderr)) return `${how}, settings.js stopped with an error: ${errorLine(r.stderr) ?? 'see the output'}.`
      const got = out(r)
      if (got.join('\n') === wanted.join('\n') && r.code === 0) return null
      if (got.length !== 3) return `${how}, settings.js should print three lines, one per setting, in the order of the task.`
      for (const [i, line] of wanted.entries()) {
        if (got[i] === line) continue
        const setting = SHOWN[i]
        if (!got[i].startsWith(`${setting}: `)) return `${how}, line ${i + 1} should start with ${setting}: and a space.`
        if (setting === 'WATER_KEY') return `${how}, the line for WATER_KEY is not right. It says only set or not set, nothing more.`
        return `${how}, the line for ${setting} is not right. Compare it with the task: the value as it is set, or what to say when it is not.`
      }
      return `${how}, settings.js ended with exit code ${r.code}. Showing the settings is not a failure, whatever is set.`
    }
    const n2 = 'With every setting set, each is shown, and the key only as set'
    const m2 = leak ? 'The key showed up; see the detail above.' : judge(all, ['WATER_PRICE: 1.95', 'LEAK_LITRES: 2500', 'WATER_KEY: set'], 'With all three set')
    results.push(m2 ? fail(n2, m2, shownRuns(all)) : pass(n2, shownRuns(all)))
    const n3 = 'With nothing set, it says so, and shows the default'
    const m3 = judge(none, ['WATER_PRICE: not set', 'LEAK_LITRES: 5000 (default)', 'WATER_KEY: not set'], 'With nothing set')
    results.push(m3 ? fail(n3, m3, reports(none)) : pass(n3, reports(none)))
    return results
  }
}

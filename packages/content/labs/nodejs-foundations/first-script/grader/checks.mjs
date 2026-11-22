import { join } from 'node:path'
import { box, broken, errorLine, fail, hasStack, lines, pass, report, reports, run } from '../../grading.mjs'

const FEE_WRONG =
  'The words are right but the fee is not. It is 0.40 for every square metre plus 15.00 for water, written with two decimals. Remember that an argument arrives as text.'
const welcome = (name) => `Welcome to Marrowfield, ${name}.`
const fee = (size) => `A ${size} square metre plot costs ${(Number(size) * 0.4 + 15).toFixed(2)} a year.`

/** Why the printed line is not the one asked for, from the clues in it. */
function wrongLine(r, dir, script, arg, { part, story, shape, wrongValue }) {
  const out = r.stdout
  if (out.trim() === '') {
    return r.stderr.trim() !== ''
      ? 'The script printed to standard error only, so nothing reached standard output. The line asked for is meant for a person to read there.'
      : 'The script printed nothing on standard output.'
  }
  if (out.includes(process.execPath)) {
    return 'The line holds the path of the node program instead of what was typed after the script. Look again at what process.argv holds at each place, counting from 0.'
  }
  if (out.includes(join(dir, script))) {
    return 'The line holds the path of the script itself instead of what was typed after it. The first value typed after the script name sits one place further along in process.argv.'
  }
  if (/undefined/.test(out)) {
    return 'The line says undefined where the value should be: the place read in process.argv holds nothing. Count again where the first value after the script name sits.'
  }
  if (story && out.includes(story) && !out.includes(arg)) {
    return `The line has ${story} in it, from the example, whatever was typed. Use the value typed after the script name instead.`
  }
  if (!out.includes(arg)) return `The line does not have ${arg} in it, the value typed after the script name.`
  if (shape && shape.test(lines(out)[0])) return wrongValue
  return `The line is not quite right. It should read exactly like the example in the task, word for word, with only the ${part} changed.`
}

async function oneLine(t, name, script, arg, expected, words) {
  const dir = await box(t)
  const r = await run(dir, script, [arg])
  const early = await broken(name, r, dir, script)
  if (early) return early
  const printed = lines(r.stdout)
  if (printed.length === 1 && printed[0] === expected && r.code === 0) return pass(name, report(r))
  if (printed.length === 1 && printed[0] === expected) {
    return fail(name, `The line is right, but the script ended with exit code ${r.code}. A script that did its job ends with 0.`, report(r))
  }
  if (printed.includes(expected)) {
    return fail(name, `The right line is there, with other lines around it. Print only that one line.`, report(r))
  }
  if (r.code !== 0 && hasStack(r.stderr)) {
    return fail(name, `${script} stopped with an error before it printed the line: ${errorLine(r.stderr) ?? 'see the output'}.`, report(r))
  }
  return fail(name, wrongLine(r, dir, script, arg, words), report(r))
}

/** The same reason for every case is said once. */
const once = (results) =>
  results.every((r) => !r.passed && r.message === results[0].message) ? [results[0]] : results

export const checks = {
  async name(t) {
    const results = await Promise.all(
      ['Osei', 'Bettany'].map((who) =>
        oneLine(t, `node welcome.js ${who} welcomes ${who}`, 'welcome.js', who, welcome(who), { part: 'name', story: 'Maud' })
      )
    )
    return once(results)
  },

  async missing(t) {
    const name = 'With no name, one line on standard error and exit code 1'
    const dir = await box(t)
    const [none, some] = await Promise.all([run(dir, 'welcome.js'), run(dir, 'welcome.js', ['Aurelio'])])
    const early = (await broken(name, none, dir, 'welcome.js')) ?? (await broken(name, some, dir, 'welcome.js'))
    if (early) return [early]
    const output = reports(none, some)
    let message
    if (hasStack(none.stderr)) {
      message =
        'With no name, Node stopped with an error and printed its stack trace. That is meant for the developer. Check for the missing name yourself and print one plain line instead.'
    } else if (none.stdout.trim() !== '' && none.stderr.trim() === '') {
      message = /undefined/.test(none.stdout)
        ? 'With no name, the script still printed a welcome, to undefined. Check whether a name was typed before you print the welcome.'
        : 'With no name, the message went to standard output. A message about a mistake belongs on standard error.'
    } else if (none.stdout.trim() !== '') {
      message = 'With no name, the script printed to standard output too. Only the one line on standard error is wanted then.'
    } else if (none.stderr.trim() === '') {
      message = 'With no name, the script printed nothing at all. Print one line to standard error that says what to type.'
    } else if (lines(none.stderr).length > 1) {
      message = 'With no name, standard error got more than one line. One plain line is enough.'
    } else if (none.code === 0) {
      message = 'With no name, the line went to standard error, but the script still ended with exit code 0, which says all went well. End with exit code 1.'
    } else if (none.code !== 1) {
      message = `With no name, the script ended with exit code ${none.code}. This task asks for 1.`
    } else if (some.code !== 0 || some.stderr.trim() !== '') {
      message = 'With a name, the script should still welcome it and end with exit code 0, with nothing on standard error.'
    } else {
      return [pass(name, output)]
    }
    return [fail(name, message, output)]
  },

  async fee(t) {
    const shape = /^A \S+ square metre plot costs .* a year\.$/
    const results = await Promise.all(
      ['100', '62.5', '250'].map((size) =>
        oneLine(t, `node fee.js ${size} prints its fee`, 'fee.js', size, fee(size), { part: 'size and the fee', shape, wrongValue: FEE_WRONG })
      )
    )
    return once(results)
  },

  async many(t) {
    const dir = await box(t)
    const [good, mixed, none, zero] = await Promise.all([
      run(dir, 'fee.js', ['40', '250']),
      run(dir, 'fee.js', ['62.5', 'plenty', '100', '-8']),
      run(dir, 'fee.js'),
      run(dir, 'fee.js', ['0'])
    ])
    for (const r of [good, mixed, none, zero]) {
      const early = await broken('fee.js prices every size', r, dir, 'fee.js')
      if (early) return [early]
    }
    const out = (r) => lines(r.stdout)
    const results = []

    const goodName = 'node fee.js 40 250 prints a line for each size'
    if (out(good).join('\n') === [fee('40'), fee('250')].join('\n') && good.code === 0) {
      results.push(pass(goodName, report(good)))
    } else {
      results.push(
        fail(
          goodName,
          out(good).length === 1
            ? 'Only one size got a line. Every size typed after the script name should get its own line, in the order they were typed.'
            : out(good)[0] !== fee('40')
              ? 'The first line is not the fee for 40 in the same words as before. Every size gets the line from Task 3.'
              : good.code !== 0
                ? `Both lines are right, but the script ended with exit code ${good.code}. When every size is fine, it ends with 0.`
                : 'Every size should get exactly one line, in the order they were typed, and nothing else.',
          report(good)
        )
      )
    }

    const mixedName = 'node fee.js 62.5 plenty 100 -8 prices the good sizes and refuses the others'
    const priced = out(mixed)
    let message
    if (priced.some((l) => /plenty|-8/.test(l) && !/costs/.test(l))) {
      message = 'The line about a refused size went to standard output. A message about a mistake belongs on standard error.'
    } else if (/NaN/.test(mixed.stdout) || priced.some((l) => /plenty|-8/.test(l))) {
      message =
        'A size that is not a number above 0 still got a fee on standard output. Turn the text into a number and refuse it when it is not a number, or not above 0.'
    } else if (priced.includes(fee('62.5')) && !priced.includes(fee('100'))) {
      message =
        'The script stopped at the size it refused, so 100, which came after it, got no line. Let the script carry on to the end, and give it the exit code without stopping it there.'
    } else if (priced.join('\n') !== [fee('62.5'), fee('100')].join('\n')) {
      message = 'The good sizes, 62.5 and 100, should each get their line from Task 3, in order, and nothing else goes to standard output.'
    } else if (!mixed.stderr.includes('plenty') || !mixed.stderr.includes('-8')) {
      message = 'Standard error should get a line for each refused size that names it, so Rhiannon can see which one was wrong.'
    } else if (mixed.code !== 1) {
      message = `The lines are right, but the script ended with exit code ${mixed.code}. When any size was refused, it ends with 1.`
    }
    results.push(message ? fail(mixedName, message, report(mixed)) : pass(mixedName, report(mixed)))

    const edgeName = 'node fee.js and node fee.js 0 are refused with exit code 1'
    let edge
    if (none.stdout.trim() !== '') {
      edge = 'With no size at all, something went to standard output. Only one line on standard error is wanted then.'
    } else if (none.stderr.trim() === '') {
      edge = 'With no size at all, the script printed nothing. Print one line on standard error that says what to type.'
    } else if (none.code !== 1) {
      edge = `With no size at all, the script ended with exit code ${none.code}. It should end with 1.`
    } else if (/costs/.test(zero.stdout)) {
      edge = 'A plot of 0 square metres got a fee. It is not a plot: refuse 0 like any size that is not a number above 0.'
    } else if (zero.stdout.trim() !== '') {
      edge = 'The line about 0 went to standard output. A message about a mistake belongs on standard error.'
    } else if (zero.code !== 1) {
      edge = `0 was refused, but the script ended with exit code ${zero.code}. When any size was refused, it ends with 1.`
    }
    results.push(edge ? fail(edgeName, edge, reports(none, zero)) : pass(edgeName, reports(none, zero)))
    return results
  }
}

import { box, broken, errorLine, fail, hasStack, lines, pass, read, report, reports, run, uncaught } from '../../grading.mjs'

const KEYS = 'Shed keys\nRhiannon has one, the gate box has the other.\nThe padlock code changes in spring.\n'
const SWAP = 'Seed swap, first Saturday of March\nBring labelled packets.\nTea in the hut from ten.\n'

const trimEnd = (text) => text.replace(/\s+$/, '')

/** Why a script that should print a file's text printed something else. */
async function wrongText(dir, r, script, expected, named) {
  const out = r.stdout
  if (out.startsWith('<Buffer')) {
    return 'The script printed the bytes of the file, not its text: <Buffer ...> is what Node prints for raw bytes. Tell readFile which encoding the text is in.'
  }
  if (/Promise \{/.test(out)) {
    return 'The script printed Promise { <pending> }: it printed the promise that readFile gives back before the reading had finished. Wait for the read to finish before you use its result.'
  }
  const error = errorLine(r.stderr) ?? ''
  if (/ERR_INVALID_ARG_TYPE/.test(error) && /undefined/.test(error)) {
    return 'readFile was given undefined instead of a file name: the place read in process.argv holds nothing. The file name is the first word typed after the script name.'
  }
  if (/ENOENT/.test(error)) {
    return `${script} stopped with ENOENT, no such file, although ${named} is there. Read the path in the error: it should be the file name that was typed.`
  }
  if (hasStack(r.stderr)) return `${script} stopped with an error: ${error || 'see the output'}.`
  if (trimEnd(out) === trimEnd((await read(dir, 'plots.txt')) ?? '')) {
    return `The script printed plots.txt, the file from the example, although ${named} was typed. Read the file whose name was typed after the script name.`
  }
  if (out.includes('process.argv')) {
    return 'The script printed its own code: the second entry of process.argv is the path of the script itself. The file name typed comes after it.'
  }
  if (out.trim() === '') return 'The script printed nothing on standard output.'
  return trimEnd(out).startsWith(trimEnd(expected))
    ? 'The file\'s text is there, with something more after it. Print the text and nothing else.'
    : `What the script printed is not the text of ${named}.`
}

/** Why a script that should print one line printed something else. */
function wrongLine(r, script) {
  if (r.stdout.split('\n').some((l) => l.endsWith('\r'))) {
    return 'A line ends with an invisible \\r carried over from the file. This list was saved on Windows, where each line ends with \\r\\n, not only \\n. Split the text so that both endings work.'
  }
  if (/Promise \{/.test(r.stdout)) {
    return 'The script printed Promise { <pending> }: a read had not finished when its result was used. Wait for it to finish.'
  }
  if (/<Buffer/.test(r.stdout)) return 'The script worked with the raw bytes of the file instead of its text. Give readFile an encoding.'
  if (hasStack(r.stderr)) return `${script} stopped with an error: ${errorLine(r.stderr) ?? 'see the output'}.`
  return null
}

export const checks = {
  async show(t) {
    const dir = await box(t, { 'shed-keys.txt': KEYS, 'seed-swap.txt': SWAP })
    const results = []
    for (const [file, text] of [['shed-keys.txt', KEYS], ['seed-swap.txt', SWAP]]) {
      const name = `node show.js ${file} prints its text`
      const r = await run(dir, 'show.js', [file])
      const early = await broken(name, r, dir, 'show.js')
      if (early) return [early]
      if (trimEnd(r.stdout) === trimEnd(text) && r.code === 0) results.push(pass(name, report(r)))
      else if (trimEnd(r.stdout) === trimEnd(text)) {
        results.push(fail(name, `The text is right, but the script ended with exit code ${r.code}.`, report(r)))
      } else results.push(fail(name, await wrongText(dir, r, 'show.js', text, file), report(r)))
    }
    return results
  },

  async missing(t) {
    const name = 'A missing file gets one plain line on standard error and exit code 1'
    const dir = await box(t, { 'seed-swap.txt': SWAP, 'compost-rota.txt': null })
    const [gone, there] = await Promise.all([
      run(dir, 'show.js', ['compost-rota.txt']),
      run(dir, 'show.js', ['seed-swap.txt'])
    ])
    const early = (await broken(name, gone, dir, 'show.js')) ?? (await broken(name, there, dir, 'show.js'))
    if (early) return [early]
    let message
    const plots = (await read(dir, 'plots.txt')) ?? ''
    if (trimEnd(gone.stdout) === trimEnd(plots) || gone.stdout.includes('process.argv')) {
      message = 'With a file that is not there, the script printed another file instead. It should read the file whose name was typed, as Task 1 asks, and only then find it missing.'
    } else if (hasStack(gone.stderr) && !uncaught(gone.stderr)) {
      message = 'With a file that is not there, the script printed the whole error, stack trace and all. That is meant for the developer. Print one plain line of your own that names the file.'
    } else if (hasStack(gone.stderr) && /ENOENT/.test(gone.stderr)) {
      message =
        'With a file that is not there, Node stopped with the ENOENT error and its stack trace. Catch that error and print one plain line for Rhiannon instead.'
    } else if (hasStack(gone.stderr)) {
      message = `With a file that is not there, the script stopped with another error: ${errorLine(gone.stderr) ?? 'see the output'}. Look at what happens around the read.`
    } else if (gone.stdout.trim() !== '' && gone.stderr.trim() === '') {
      message = 'The message about the missing file went to standard output. A message about a mistake belongs on standard error.'
    } else if (gone.stdout.trim() !== '') {
      message = 'With a file that is not there, something went to standard output too. Only the line on standard error is wanted.'
    } else if (gone.stderr.trim() === '') {
      message = 'With a file that is not there, the script printed nothing. Print one line on standard error that names the file.'
    } else if (lines(gone.stderr).length > 1) {
      message = 'With a file that is not there, standard error got more than one line. One plain line is enough.'
    } else if (!gone.stderr.includes('compost-rota.txt')) {
      message = 'The line on standard error should name the file that was not found, so Rhiannon can see what she typed.'
    } else if (gone.code !== 1) {
      message = `The line is right, but the script ended with exit code ${gone.code}. A script that could not do its job ends with 1.`
    } else if (there.code !== 0 || trimEnd(there.stdout) !== trimEnd(SWAP)) {
      message = 'A file that is there should still be printed as in Task 1, with exit code 0.'
    } else {
      return [pass(name, reports(gone, there))]
    }
    return [fail(name, message, reports(gone, there))]
  },

  async count(t) {
    const unix = 'D1,Cassius Kowal\nD2,\nD3,Rowan Amberley\nD4,Tobiah Grint\nD5,\n'
    const windows = 'E1,\r\nE2,Elsbeth Tierney\r\n\r\nE3,Rennick Prosser\r\nE4,\r\nE5,\r\nE6,Morwenna Calloway\r\n\r\n'
    const dir = await box(t, { 'north-field.txt': unix, 'south-field.txt': windows })
    const cases = [
      ['north-field.txt', '5 plots, 2 free', 'whose lines end with \\n'],
      ['south-field.txt', '6 plots, 3 free', 'saved on Windows, with blank lines']
    ]
    const results = []
    for (const [file, expected, about] of cases) {
      const name = `node count-plots.js ${file} counts a list ${about}`
      const r = await run(dir, 'count-plots.js', [file])
      const early = await broken(name, r, dir, 'count-plots.js')
      if (early) return [early]
      const printed = lines(r.stdout)
      if (printed.length === 1 && printed[0] === expected && r.code === 0) {
        results.push(pass(name, report(r)))
        continue
      }
      let message = wrongLine(r, 'count-plots.js')
      const m = /^(\d+) plots, (\d+) free$/.exec(printed[0] ?? '')
      if (message) {
        // already said
      } else if (/\b12 plots\b/.test(r.stdout)) {
        message = `The script counted plots.txt, the file from the example, although ${file} was typed. Read the file whose name was typed.`
      } else if (!m) {
        message = 'The line should read like the example in the task: the number of plots, the word plots, a comma, the number free and the word free.'
      } else if (file === 'south-field.txt' && Number(m[1]) > 6) {
        message = 'More plots were counted than the list has: a blank line was counted as a plot. On this list, saved on Windows, a blank line is not empty: it holds an invisible \\r.'
      } else if (file === 'south-field.txt' && Number(m[2]) < 3) {
        message = 'Fewer free plots were counted than the list has. This list was saved on Windows: each line ends with \\r\\n, so after splitting on \\n alone, a free plot still holds an invisible \\r after its comma.'
      } else if (Number(m[1]) !== (file === 'north-field.txt' ? 5 : 6)) {
        message = 'The number of plots is not right. Each line that is not blank is one plot; the line break after the last line does not make another one.'
      } else {
        message = 'The number of free plots is not right. A free plot has nothing after its comma.'
      }
      if (printed.length > 1 && !message) message = 'Print only the one line.'
      results.push(fail(name, message, report(r)))
    }
    return results
  },

  async holder(t) {
    const list = 'F1,Cassius Kowal\r\nF2,\r\nF3,Rowan Amberley\r\nF4,Tobiah Grint\r\n'
    const dir = await box(t, { 'east-field.txt': list })
    const [held, free, nowhere] = await Promise.all([
      run(dir, 'holder.js', ['east-field.txt', 'F3']),
      run(dir, 'holder.js', ['east-field.txt', 'F2']),
      run(dir, 'holder.js', ['east-field.txt', 'G7'])
    ])
    for (const r of [held, free, nowhere]) {
      const early = await broken('holder.js finds the holder', r, dir, 'holder.js')
      if (early) return [early]
    }
    const one = (name, r, expected) => {
      const printed = lines(r.stdout)
      if (printed.length === 1 && printed[0] === expected && r.code === 0) return pass(name, report(r))
      const plot = expected.split(':')[0]
      let message = new RegExp(`ENOENT.*'${plot}'`).test(r.stderr)
        ? `The script tried to open ${plot} as a file. The file comes first after the script name, the plot second.`
        : wrongLine(r, 'holder.js')
      if (!message && /Maud|Petronella|Bettany/.test(r.stdout)) {
        message = 'The script read plots.txt, the file from the example. Read the file named first after the script name.'
      }
      if (!message && r.stdout.includes('east-field.txt')) {
        message = 'The line names the file instead of the plot. The file comes first after the script name, the plot second.'
      }
      message ??= `The line should read like the example in the task: the plot, a colon and a space, then ${
        expected.endsWith('free') ? 'the word free for a plot with nobody on it' : 'the holder\'s name'
      }.`
      return fail(name, message, report(r))
    }
    const results = [
      one('node holder.js east-field.txt F3 names the holder', held, 'F3: Rowan Amberley'),
      one('node holder.js east-field.txt F2 says the plot is free', free, 'F2: free')
    ]
    const name = 'node holder.js east-field.txt G7 says there is no such plot'
    let message
    if (hasStack(nowhere.stderr)) message = `For a plot that is not in the list, the script stopped with an error: ${errorLine(nowhere.stderr) ?? 'see the output'}.`
    else if (nowhere.stdout.trim() !== '') message = 'For a plot that is not in the list, something went to standard output. That is a mistake in what was typed, so the line belongs on standard error.'
    else if (!nowhere.stderr.includes('G7')) message = 'For a plot that is not in the list, print one line on standard error that names the plot.'
    else if (nowhere.code !== 1) message = `The line is right, but the script ended with exit code ${nowhere.code}. It could not do its job, so it ends with 1.`
    results.push(message ? fail(name, message, report(nowhere)) : pass(name, report(nowhere)))
    return results
  }
}

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { call, judge } from '../../grading.mjs'

const FLAGS = ['--strict', '--verbatimModuleSyntax']
// Check's own order.ts for the files that import it, so a task never waits on Task 1.
const SHARED = { 'src/order.ts': 'grader/order.ts' }
const GROWN = { 'src/order.ts': 'grader/order-grown.ts' }

const yunnan = { id: 'OK-3101', blend: 'Golden Yunnan', tins: 2, grams: 500, express: false }
const keemun = { id: 'OK-3102', blend: 'Morning Keemun', tins: 1, grams: 50, express: true }
const sampler = { id: 'OK-3103', blend: 'Nilgiri Frost', tins: 12, grams: 3000, express: false }

const COMMENTS = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g
const IMPORT = /\bimport\s+(type\s+)?\{([^}]*)\}\s*from\s*(['"])([^'"\n]*)\3/g

const fail = (name, message, output) => ({ name, passed: false, message, output })
const pass = (name) => ({ name, passed: true })

/**
 * How `file` gets Order: no copy of its own, and one import of it from ./order.ts that is erased
 * when the file runs. Null when the import sits above the task's comment, with the one message.
 */
async function sharesOrder(t, file, task) {
  const name = file.replace('src/', '')
  const text = await readFile(join(t.workspace, file), 'utf8')
  const code = text.replace(COMMENTS, (m) => m.replace(/[^\n]/g, ' '))
  const mark = text
    .split('\n')
    .findIndex((l) => new RegExp(`^\\s*//+\\s*task\\s*${task}\\b`, 'i').test(l))
  const found = [...code.matchAll(IMPORT)]
    .filter((m) => /(?:^|[\s,])(?:type\s+)?Order\b/.test(m[2]))
    .map((m) => ({
      type: Boolean(m[1]),
      inline: !m[1] && /(?:^|[\s,])type\s+Order\b/.test(m[2]),
      path: m[4],
      line: code.slice(0, m.index).split('\n').length - 1,
      text: m[0].replace(/\s+/g, ' ')
    }))
  if (mark !== -1 && found.some((f) => f.line < mark)) {
    return [
      fail(
        `${name} imports Order under // Task ${task}`,
        `The import of Order is above the // Task ${task} comment. Check reads the lines under that comment as your work for this task, and the lines above it as the starter gave them, so move the import to just below the comment.`
      )
    ]
  }
  const details = []
  const copy = /(?:^|[^\w$.])(?:type\s+Order\s*[=<]|interface\s+Order\b)/m.test(code)
  details.push(
    copy
      ? fail(
          `${name} has no copy of Order`,
          `${name} still declares a type called Order of its own. A copy drifts away from the one in order.ts, which is how shipping went wrong. Take it out and use the Order you import.`
        )
      : pass(`${name} has no copy of Order`)
  )
  const title = `${name} imports Order from order.ts as a type only`
  const one = found[0]
  if (!one) {
    details.push(
      fail(
        title,
        `Check cannot find an import of Order in ${name}. Write it just below the // Task ${task} comment, as the lesson shows.`
      )
    )
  } else if (one.path !== './order.ts') {
    const local = one.path.startsWith('./') || one.path.startsWith('../')
    const bare = one.path.replace(/^\.\//, '')
    details.push(
      fail(
        title,
        !local
          ? `The path '${one.path}' does not start with ./, so the compiler and Node look for a package of that name instead of a file in the same folder as ${name}.`
          : /^order\.[cm]?js$/.test(bare)
            ? `The path '${one.path}' names a file that is not there: these files run as .ts files, and Node finds a file only by its whole name. The compiler lets it through, and a type-only import never reaches Node, so both commands are quiet today; the day this line imports a value, Node looks for that file and stops. Write the real name of the file, as the lesson shows.`
            : bare === 'order'
            ? `The path '${one.path}' has no ending. These files run as .ts files, and Node finds a file only by its whole name, ending included.`
            : `The path '${one.path}' does not lead to order.ts. It sits in the same folder as ${name}.`,
        one.text
      )
    )
  } else if (!one.type) {
    details.push(
      fail(
        title,
        one.inline
          ? `With type inside the curly braces, the name is erased but the import line stays, empty, so Node still opens order.ts every time ${name} runs. Say that the whole line is about types, as the lesson shows, so the whole line is erased.`
          : `This imports Order as a value. Types are erased before the file runs, so Node finds no Order in order.ts and stops. Say that it is a type only, as the lesson shows.`,
        one.text
      )
    )
  } else {
    details.push(pass(title))
  }
  return details
}

/**
 * With an import of Order that is there but wrong, the compiler and Node fail on that line, so
 * Check's own misuses and runs fail too; the message about the import says the one cause.
 */
function afterImport(shared, judged) {
  const imported = shared.find((d) => d.name.includes('imports Order from order.ts'))
  if (!imported || imported.passed || /cannot find an import/.test(imported.message)) return judged
  return judged.filter((d) => d.passed || !/^Wrong uses are refused$|^Task \d runs$/.test(d.name))
}

export const checks = {
  order(t) {
    return judge(t, {
      file: 'src/order.ts',
      task: 1,
      flags: FLAGS,
      uses: 'grader/types/order.uses.ts',
      misuse: 'grader/types/order.misuse.ts',
      messages: {
        uses: "Check's own code makes an order as the form sends it, and reads each property as its type, and the compiler refuses it. Compare each property of Order with the task: its name, and text, a number, or true or false. The output says which use.",
        misuse:
          "Check's own code makes an order with a property missing, too many, or of the wrong type, and the compiler lets it through. The output says which use."
      }
    })
  },

  async packing(t) {
    const shared = await sharesOrder(t, 'src/packing.ts', 2)
    if (shared.length === 1) return shared
    const judged = await judge(t, {
      file: 'src/packing.ts',
      task: 2,
      flags: FLAGS,
      swaps: SHARED,
      uses: 'grader/types/packing.uses.ts',
      misuse: 'grader/types/packing.misuse.ts',
      messages: {
        compiles:
          'Check compiles packing.ts beside its own order.ts, with an Order as Task 1 asks for, and the compiler refuses a line of Task 2. Run npm run types and read the message for that line.',
        uses: "Check's own code passes packingSlip an Order from order.ts, and the compiler refuses it. packingSlip should take the Order of order.ts. The output says which use."
      },
      follow: {
        swaps: GROWN,
        uses: 'grader/types/packing.follow.uses.ts',
        misuse: 'grader/types/packing.follow.misuse.ts',
        name: 'packingSlip follows order.ts',
        message:
          'Check added a property, giftNote, to Order in its own order.ts, and packingSlip did not follow: it still takes an order of some other type. Use the Order you import from order.ts, and no copy.'
      },
      cases: [
        call(
          'packingSlip',
          [yunnan],
          'OK-3101: 2 x Golden Yunnan, 500 g, standard',
          'packingSlip should give the slip as before. Leave its body as it is.'
        ),
        call(
          'packingSlip',
          [keemun],
          'OK-3102: 1 x Morning Keemun, 50 g, express',
          'packingSlip should give the slip as before. Leave its body as it is.'
        )
      ]
    })
    return [...shared, ...afterImport(shared, judged)]
  },

  async shipping(t) {
    const shared = await sharesOrder(t, 'src/shipping.ts', 3)
    if (shared.length === 1) return shared
    const prices =
      'shippingFor should charge by the grams of the whole order: 295 up to 500 g, 450 up to 2000 g, 695 above, and 250 more for express. Check what it reads from the order.'
    const judged = await judge(t, {
      file: 'src/shipping.ts',
      task: 3,
      flags: FLAGS,
      swaps: SHARED,
      uses: 'grader/types/shipping.uses.ts',
      misuse: 'grader/types/shipping.misuse.ts',
      messages: {
        compiles:
          'Check compiles shipping.ts beside its own order.ts, with an Order as Task 1 asks for, and the compiler refuses a line of Task 3. Run npm run types, read the message for that line, and fix that line, not order.ts.',
        uses: "Check's own code passes shippingFor an Order from order.ts, and the compiler refuses it. shippingFor should take the Order of order.ts. The output says which use."
      },
      follow: {
        swaps: GROWN,
        uses: 'grader/types/shipping.follow.uses.ts',
        misuse: 'grader/types/shipping.follow.misuse.ts',
        name: 'shippingFor follows order.ts',
        message:
          'Check added a property, giftNote, to Order in its own order.ts, and shippingFor did not follow: it still takes an order of some other type. Use the Order you import from order.ts, and no copy.'
      },
      cases: [
        call('shippingFor', [yunnan], 295, prices),
        call('shippingFor', [keemun], 545, prices),
        call('shippingFor', [sampler], 695, prices),
        call('shippingFor', [{ ...yunnan, grams: 501 }], 450, prices)
      ]
    })
    return [...shared, ...afterImport(shared, judged)]
  }
}

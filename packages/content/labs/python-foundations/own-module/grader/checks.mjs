import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { atLine, dataCases, errorWords, fail, firstLines, pass, problem, runFile } from '../../grading.mjs'

const REPORT = 'report.py'
const MODULE = 'callouts.py'

// callouts.py is judged as a module: Check imports it the way an import line does, in its own
// Python, reads what the import printed and which functions of the workspace it called, then
// calls a function of it. report.py is judged by running it, as python3 report.py does.

/** Check's own reading functions, set in callouts before and after its lines for Task 3, so it never depends on Task 1. */
const READERS = `
def parts_of(line):
    return [part.strip() for part in line.split(";")]


def hill_of(line):
    return parts_of(line)[1]


def hours_of(line):
    return int(parts_of(line)[2])
`

/**
 * Which module each name of report.py comes from, after the lines under # Task 1. After
 * import callouts (or import callouts as c), report.py reaches them through the module.
 */
const JUDGE = `
def _judge():
    found = {}
    whole = any(getattr(v, "__name__", None) == "callouts" and hasattr(v, "__file__") for v in list(globals().values()))
    for name in ("hill_of", "hours_of"):
        value = globals().get(name)
        found[name] = getattr(value, "__module__", None) if callable(value) else ("callouts" if whole else None)
    return found
`

const LINES = [
  '27/11/2041; Meikle Pap; 4; Iain, Kirsty',
  '  03/12/2041 ;Glas Tholl;  11 ; Rhona',
  '30/12/2041; Stob Ruadh ; 7 ;Ailsa, Shona, Dougie',
  '05/01/2042;Meikle Pap;1;Dougie'
]

const NEEDS = (error) =>
  error.type === 'NameError' && /'parts_of'/.test(error.message)
    ? 'hill_of and hours_of call parts_of, and callouts.py has no parts_of. A function that moves takes what it calls with it, or the file it moved to does not know that name'
    : null

const CIRCLE =
  'is called, callouts.py imports report.py, so the whole report runs again inside it: an import hidden inside a function to get round a circle. callouts.py must not need report.py at all. Move what the function needs into callouts.py with it.'

const hidden = (fn) => (watched, c, call) =>
  call.loaded?.includes('report') ? `When ${fn} ${CIRCLE}` : null

/** One detail for one cause: an import that fails fails every function of the module alike. */
const distinct = (details) =>
  details.filter((d, i) => details.findIndex((e) => e.name === d.name && e.message === d.message) === i)

export const checks = {
  async move(t) {
    const hills = await dataCases(t, {
      file: MODULE,
      module: true,
      task: 1,
      fn: 'hill_of',
      errors: NEEDS,
      forbid: hidden('hill_of'),
      typed: 'hill_of in callouts.py gives back the same hill whatever line Check gives it.',
      list: LINES.slice(0, 3).map((line) => ({
        name: `callouts.hill_of for "${line}"`,
        args: [line],
        expected: line.split(';')[1].trim(),
        hint: 'hill_of in callouts.py does not give back the hill of the line, without the spaces around it. Move it as it was in report.py.'
      }))
    })
    const hours = await dataCases(t, {
      file: MODULE,
      module: true,
      task: 1,
      fn: 'hours_of',
      errors: NEEDS,
      forbid: hidden('hours_of'),
      list: LINES.slice(1).map((line) => ({
        name: `callouts.hours_of for "${line}"`,
        args: [line],
        expected: Number(line.split(';')[2]),
        hint: 'hours_of in callouts.py does not give back the hours of the line as a whole number. Move it as it was in report.py.'
      }))
    })
    const found = distinct([...hills, ...hours])
    if (found.some((d) => !d.passed)) return found

    const text = await readFile(join(t.workspace, REPORT), 'utf8')
    const left = ['parts_of', 'hill_of', 'hours_of'].filter((name) =>
      new RegExp(`^def\\s+${name}\\b`, 'm').test(text)
    )
    if (left.length) {
      return [
        ...found,
        fail(
          'report.py no longer has the reading functions',
          `report.py still has its own def ${left.join(', def ')}. Moved means they live in callouts.py only: two copies of one function drift apart the first time someone mends one of them. Delete them from report.py, and import what report.py uses from callouts.`
        )
      ]
    }

    const r = await runFile(t, REPORT, {
      upto: 1,
      blocks: true,
      data: true,
      modules: true,
      define: JUDGE,
      call: { name: '_judge', args: [] }
    })
    if (r.blocks) {
      r.blocks.explain = (error) =>
        error.type === 'NameError' && /'(hill_of|hours_of)'/.test(error.message)
          ? `report.py no longer has ${/'(\w+)'/.exec(error.message)[1]}, and no import line under # Task 1 brings it in from callouts`
          : null
    }
    const p = problem(r, REPORT, 1)
    if (p) return [...found, p]
    const made = r.call?.returned?.data?.['@dict'] ?? []
    const from = Object.fromEntries(made)
    const name = 'report.py imports hill_of and hours_of from callouts'
    const own = Object.keys(from).filter((k) => from[k] !== 'callouts')
    if (own.length) {
      return [
        ...found,
        fail(
          name,
          `After the lines under # Task 1 of report.py, ${own.join(' and ')} ${own.length > 1 ? 'do' : 'does'} not come from callouts. Import ${own.length > 1 ? 'them' : 'it'} from the module callouts, the file name without .py.`,
          `Check ran the lines of report.py up to # Task 3\nWhere each name comes from: ${made.map(([k, v]) => `${k}: ${v ?? 'not there'}`).join(', ')}`
        )
      ]
    }
    return [...found, pass(name, `The lines under # Task 1 printed:\n${firstLines(r.parts.get(1).lines).join('\n')}`)]
  },

  async guard(t) {
    const imported = await runFile(t, MODULE, { upto: 2, blocks: true, data: true, module: true })
    const p = problem(imported, MODULE, 2)
    if (p) return [p]
    const part = imported.parts.get(2)
    const details = []
    const quiet = 'Importing callouts.py prints nothing and calls nothing'
    if (part.lines.length || part.calls?.length) {
      const what = [
        part.lines.length ? 'prints lines' : '',
        part.calls?.length ? `calls ${part.calls.join(', ')}` : ''
      ].filter(Boolean).join(' and ')
      const hers = part.lines.includes('Trying crew_of on one line:') || part.calls?.length
      details.push(
        fail(
          quiet,
          hers
            ? `Importing callouts.py ${what}: Ailsa's try-out lines run every time a file imports it, in the middle of the report. Put them under a main guard, so they run only when callouts.py is run by itself.`
            : `Importing callouts.py ${what}: a print at the top of the file, outside any def and outside the guard, runs every time a file imports it, in the middle of the report. Move it in under the guard, or take it out.`,
          `Check imported callouts.py\nIt printed:\n${part.lines.length ? firstLines(part.lines).join('\n') : '(nothing)'}`
        )
      )
    } else details.push(pass(quiet, 'Check imported callouts.py\nIt printed nothing'))

    const alone = await runFile(t, MODULE, { blocks: true, modules: true })
    const head = alone.parts.get(0)
    const name = 'Run by itself, callouts.py still tries crew_of'
    const want = ['Trying crew_of on one line:', "['Rhona', 'Dougie']"]
    if (!head) {
      const q = problem(alone, MODULE, 0)
      details.push(fail(name, q?.message ?? `Python stopped without a word while it ran ${MODULE}.`, q?.output))
    } else if (head.error) {
      details.push(
        fail(
          name,
          `Run by itself, callouts.py stops${atLine(head.error)} with ${head.error.type}: ${errorWords(head.error, head.names, alone.blocks)}.`,
          head.error.shown
        )
      )
    } else if (want.every((line) => head.lines.includes(line))) {
      details.push(pass(name, `Check ran python3 callouts.py\nIt printed:\n${firstLines(head.lines).join('\n')}`))
    } else {
      details.push(
        fail(
          name,
          head.lines.length
            ? "Run by itself, callouts.py no longer prints Ailsa's try-out lines as they were. Keep them as they came, moved in under the guard."
            : "Run by itself, callouts.py prints nothing, so Ailsa's try-out lines never run. Either they are gone, or the guard is never true: it compares __name__, with two underscores on each side, with the text \"__main__\", spelt the same way.",
          `Check ran python3 callouts.py\nIt printed:\n${head.lines.length ? firstLines(head.lines).join('\n') : '(nothing)'}`
        )
      )
    }
    return details
  },

  hours(t) {
    const list = [
      ['Two callouts on the hill', LINES, 'Meikle Pap', 5],
      ['One callout on the hill', LINES, 'Stob Ruadh', 7],
      ['No callout on the hill', LINES, 'Creag Bheag', 0],
      ['An empty log', [], 'Glas Tholl', 0]
    ]
    return dataCases(t, {
      file: MODULE,
      module: true,
      task: 3,
      fn: 'hill_hours',
      define: READERS,
      watch: ['callouts.hill_of', 'callouts.hours_of'],
      forbid: (watched, c, call) => {
        const circle = hidden('hill_hours')(watched, c, call)
        if (circle) return circle
        // hours_of is only reached for a line on the hill, so a case with no such line asks only for hill_of.
        const skipped = [
          c.args[0].length && !watched.includes('callouts.hill_of') && ['hill_of', 'the hill'],
          c.expected && !watched.includes('callouts.hours_of') && ['hours_of', 'the hours']
        ].find(Boolean)
        return skipped
          ? `hill_hours reads ${skipped[1]} of a line by itself, without ${skipped[0]}. The task asks it to use hill_of and hours_of: they are in the same file, so it calls them by their names, and the module keeps one way of reading a line.`
          : null
      },
      typed: 'hill_hours gives back the same number whatever Check gives it. Add up the lines it is given.',
      list: list.map(([name, lines, hill, want]) => ({
        name,
        args: [lines, hill],
        expected: want,
        hint: (v) => {
          const on = lines.filter((line) => line.split(';')[1].trim() === hill)
          if (v.type === 'int' && v.value === on.length)
            return 'hill_hours gives back how many callouts there were on the hill, not their hours added up.'
          if (v.type === 'int' && on.length > 1 && v.value === Number(on[0].split(';')[2]))
            return 'hill_hours gives back the hours of the first callout on the hill only. A return inside the loop ends the function in its first round: give back the total after the loop.'
          return 'hill_hours does not give back the hours of the callouts on that hill, added up.'
        }
      }))
    })
  }
}

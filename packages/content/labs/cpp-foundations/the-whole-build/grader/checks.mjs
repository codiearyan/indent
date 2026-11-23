import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { codeOnly, cppText, fail, judgeFile, num, pass, quoted } from '../../grading.mjs'

const REPAIR_H = 'src/repair.h'
const REPAIR_CPP = 'src/repair.cpp'
const DAYBOOK_H = 'src/daybook.h'
const DAYBOOK_CPP = 'src/daybook.cpp'
const REPORT_H = 'src/report.h'
const REPORT_CPP = 'src/report.cpp'
const MAIN = 'src/main.cpp'
const SOURCES = [REPAIR_CPP, DAYBOOK_CPP, REPORT_CPP, MAIN]
const LEARNER = [REPAIR_H, REPAIR_CPP, DAYBOOK_H, DAYBOOK_CPP, REPORT_H, REPORT_CPP, MAIN]
const HEADING = 'ticket,item,minutes,parts'
const put = (key, expr) => `indent_::put_("${key}", ${expr});`

const classSpec = {
  className: 'DayBook',
  members: ['repairs'],
  functions: ['load', 'longest', 'count', 'totalMinutes', 'all'],
  own: ['Repair', 'DayBook'],
  extraFlags: ['-Wextra'],
  allWarnings: true
}

// Check's own DayBook::load, written as Task 1 asks. It sets room aside first, so that the end of
// an empty book is an address of its own and not nullptr, and a longest() that reads at the end of
// an empty book is found out the same way on every run.
const LOAD = 'int DayBook::load(std::istream& in) { repairs.reserve(16); std::string line; int n = 0, refused = 0; while (std::getline(in, line)) { n++; if (n == 1 || line.find_first_not_of(" \\t\\r") == std::string::npos) continue; Repair r; if (parseRepair(line, r)) repairs.push_back(r); else refused++; } return refused; }'
const LONGEST = 'const Repair* DayBook::longest() const { const Repair* best = nullptr; for (const Repair& r : repairs) if (!best || r.minutes > best->minutes) best = &r; return best; }'
const GIVEN = 'int DayBook::count() const { return static_cast<int>(repairs.size()); } int DayBook::totalMinutes() const { int t = 0; for (const Repair& r : repairs) t += r.minutes; return t; } const std::vector<Repair>& DayBook::all() const { return repairs; }'
const loadBook = (text) => `DayBook book; { std::istringstream in(${cppText(text)}); book.load(in); }`
const listOf = (got, key) => {
  try {
    return JSON.parse(got[key])
  } catch {
    return null
  }
}
const same = (a, b) => Array.isArray(a) && a.length === b.length && a.every((x, i) => x === b[i])
const numbers = (list) => (list === null ? 'nothing Check could read' : list.length ? list.join(', ') : 'none')

/** A failing detail when a file of the program includes a .cpp file, or null. */
async function noCppIncluded(t) {
  for (const file of LEARNER) {
    const text = (await readFile(join(t.workspace, file), 'utf8').catch(() => '')).replace(/\r\n/g, '\n')
    const code = codeOnly(text).split('\n')
    const m = text.split('\n').map((l, i) => (/^\s*#\s*include\s*"/.test(code[i]) ? /^\s*#\s*include\s*"([^"]+\.cpp)"/.exec(l) : null)).find(Boolean)
    if (m) {
      return fail(
        `${file} includes no .cpp file`,
        `${file} includes ${m[1]}, a .cpp file. Each .cpp file is compiled on its own, into an object file of its own, and the linker joins them: with ${m[1]} pasted into ${file} as well, its functions are in two object files and the linker finds them twice (something like "duplicate symbol" or "multiple definition of"). A file includes headers only, and the header declares what the other file writes.`
      )
    }
  }
  return null
}

export const checks = {
  async load(t) {
    const included = await noCppIncluded(t)
    if (included) return [included]
    const streams = [
      { what: 'two good lines', text: `${HEADING}\n4417,carriage clock,95,12.50\n52,pocket watch,30,0.75\n`, tickets: [4417, 52], refused: 0 },
      { what: 'bad lines and blank ones between good lines', text: `${HEADING}\n4417,carriage clock,95,12.50\n61,wall clock,fifty,4.00\n\n52,pocket watch,30,0.75\n7,cuckoo clock,20\n  \n`, tickets: [4417, 52], refused: 2 },
      { what: 'Windows line ends and no line end after the last', text: `${HEADING}\r\n4417,carriage clock,95,12.50\r\n\r\n61,wall clock,50,4.00`, tickets: [4417, 61], refused: 0 },
      { what: 'only the heading', text: `${HEADING}\n`, tickets: [], refused: 0 }
    ]
    return judgeFile(t, {
      ...classSpec,
      files: [DAYBOOK_CPP, REPAIR_H, DAYBOOK_H, REPAIR_CPP],
      toolFile: DAYBOOK_CPP,
      writtenIn: DAYBOOK_CPP,
      task: 1,
      cases: streams.map((s) => ({
        name: `load on ${s.what}`,
        code: `DayBook book; std::istringstream in(${cppText(s.text)}); ${put('refused', 'book.load(in)')} std::vector<int> tickets; for (const Repair& r : book.all()) tickets.push_back(r.ticket); ${put('tickets', 'tickets')}`,
        judge: (got) => {
          const tickets = listOf(got, 'tickets')
          const refused = num(got, 'refused')
          if (same(tickets, s.tickets) && refused === s.refused) return null
          if (tickets === null) return 'Check could not read the repairs of the book after load.'
          if (refused === s.refused + 1) return `load gave back ${refused} refused lines where ${s.refused === 0 ? 'none are' : `${s.refused} are`} wrong: the heading, or a blank line, was counted as refused. Both are skipped.`
          if (!same(tickets, s.tickets)) return `After load, the book holds the tickets ${numbers(tickets)}, and the good lines are ${numbers(s.tickets)}, in that order.`
          return `load gave back ${refused} refused lines, and ${s.refused} ${s.refused === 1 ? 'line is' : 'lines are'} not repairs.`
        },
        output: (got) => `The stream holds ${quoted(s.text)}\nload gave back ${got.refused ?? '?'}; the book holds the tickets ${numbers(listOf(got, 'tickets'))}`
      }))
    })
  },

  async longest(t) {
    const included = await noCppIncluded(t)
    if (included) return [included]
    const books = [
      { what: 'three repairs', text: `${HEADING}\n4417,carriage clock,95,12.50\n52,pocket watch,120,0.75\n61,wall clock,30,4.00\n`, at: 1 },
      { what: 'two repairs with the most minutes', text: `${HEADING}\n7,ship clock,60,1.00\n8,travel clock,90,1.00\n9,wall clock,90,1.00\n`, at: 1 },
      { what: 'one repair', text: `${HEADING}\n33,cuckoo clock,15,2.00\n`, at: 0 },
      { what: 'no repairs', text: `${HEADING}\n`, at: -1 }
    ]
    return judgeFile(t, {
      ...classSpec,
      files: [DAYBOOK_CPP, REPAIR_H, DAYBOOK_H, REPAIR_CPP],
      toolFile: DAYBOOK_CPP,
      writtenIn: DAYBOOK_CPP,
      task: 2,
      member: 'longest',
      uses: ['max_element'],
      provides: [{ name: 'DayBook::load', task: 1, file: DAYBOOK_CPP, lines: [LOAD] }],
      cases: books.map((b) => ({
        name: `longest of ${b.what}`,
        code: `${loadBook(b.text)} const Repair* p = indent8_::deep_([&] { return book.longest(); }); indent8_::scrub_(); int at = -2; if (!p) at = -1; for (std::size_t i = 0; i < book.all().size(); i++) if (&book.all()[i] == p) at = static_cast<int>(i); ${put('at', 'at')}`,
        judge: (got) => {
          const at = num(got, 'at')
          if (at === b.at) return null
          if (b.at === -1) return 'For a book with no repairs, longest gave back an address all the same. With nothing in the book there is no longest repair: it gives back nullptr. std::max_element on an empty range gives back the end, which is no repair at all.'
          if (at === -1) return `For a book with ${b.what}, longest gave back nullptr.`
          if (at === -2) return 'longest gave back the address of a repair that is not in the book: a copy, which ends when longest returns, so what the caller reads through it has no promised value. Give back the address of the repair inside the book.'
          if (b.what.startsWith('two') && at === 2) return 'Two repairs have the most minutes, and longest gave back the second of them. The task asks for the first: std::max_element keeps the first of equal ones when the comparison says whether one has strictly fewer minutes than another.'
          return `For a book with ${b.what}, longest gave back the repair at place ${at}, which does not have the most minutes. The comparison tells std::max_element whether the first repair has fewer minutes than the second.`
        },
        output: (got) => {
          const at = num(got, 'at')
          return `longest of a book of ${b.what} gave back ${at === -1 ? 'nullptr' : at === -2 ? 'an address outside the book' : at === undefined ? '?' : `the repair at place ${at} of the book`}`
        }
      }))
    })
  },

  async summary(t) {
    const included = await noCppIncluded(t)
    if (included) return [included]
    const header = await readFile(join(t.workspace, REPORT_H), 'utf8').catch(() => '')
    const guard = codeOnly(header)
    if (!/^\s*#\s*ifndef\s+\w+/m.test(guard) || !/^\s*#\s*define\s+\w+/m.test(guard) || !/^\s*#\s*endif\b/m.test(guard)) {
      return [fail('report.h keeps its include guard', 'report.h has lost a line of its include guard: the #ifndef and #define at the top, or the #endif on the last line. Every header keeps its guard, so a file that includes it twice, through another header, reads it once.')]
    }
    const books = [
      { what: 'three repairs', text: `${HEADING}\n4417,carriage clock,95,12.50\n52,pocket watch,120,0.75\n61,wall clock,30,4.00\n`, want: 'Repairs: 3\nMinutes: 245\nLongest: ticket 52, 120 minutes\n' },
      { what: 'two repairs with the most minutes', text: `${HEADING}\n7,ship clock,60,1.00\n8,travel clock,90,1.00\n9,wall clock,90,1.00\n`, want: 'Repairs: 3\nMinutes: 240\nLongest: ticket 8, 90 minutes\n' },
      { what: 'no repairs', text: `${HEADING}\n`, want: 'Repairs: 0\nMinutes: 0\nLongest: none\n' }
    ]
    return judgeFile(t, {
      ...classSpec,
      // report.h first: the linker's words name the first header as the one that declares writeSummary.
      files: [REPORT_CPP, REPORT_H, REPAIR_H, DAYBOOK_H, REPAIR_CPP],
      toolFile: REPORT_CPP,
      task: 3,
      fn: 'writeSummary',
      declaredIn: REPORT_H,
      writtenIn: REPORT_CPP,
      others: [DAYBOOK_CPP, MAIN],
      provides: [{ name: 'DayBook', lines: [LOAD, LONGEST, GIVEN] }],
      sig: {
        returns: 'void',
        params: [
          { type: 'std::ostream&', what: 'the stream' },
          { type: 'const DayBook&', what: 'the day book' }
        ]
      },
      callWith: 'std::ostream&, const DayBook&',
      cases: books.map((b) => ({
        name: `writeSummary of a book of ${b.what}`,
        code: `${loadBook(b.text)} const DayBook& view = book; std::ostringstream out; writeSummary(out, view); ${put('text', 'out.str()')}`,
        judge: (got, stdout) => {
          const text = got.text ?? ''
          if (text === b.want) return null
          if (!text && stdout.trim()) return 'writeSummary wrote to std::cout, and not to the stream it is handed. Check hands it a stream of its own.'
          if (text === b.want.slice(0, -1)) return 'The last line of the summary has no line end. Each of the three lines ends with one.'
          const lines = text.split('\n')
          const wantLines = b.want.split('\n')
          const k = wantLines.findIndex((l, i) => l !== lines[i])
          if (k === 2 && b.what.startsWith('no')) return `For an empty book, the last line reads ${quoted(lines[2])}. When the book is empty there is no longest repair, and the line says so in a word: the task gives it.`
          if (k === 2 && b.what.startsWith('two')) return `The last line reads ${quoted(lines[2])}. Two repairs have the most minutes, and the line names the one longest gives back, the first of them.`
          return `Line ${k + 1} of the summary reads ${quoted(lines[k] ?? '')}: compare it, character by character, with the task's line.`
        },
        output: (got) => `writeSummary wrote:\n${(got.text ?? '').split('\n').filter((l, i, all) => i < all.length - 1 || l).map((l) => `  ${JSON.stringify(l)}`).join('\n') || '  nothing'}`
      }))
    })
  },

  async build(t) {
    return judgeBuild(t)
  }
}

// ---------- build.sh ----------
//
// Check never runs build.sh. It reads it as sh would split it: comments and blank lines out, a line
// ending in \ joined to the next, commands apart at ; and &&, words apart at spaces except inside
// quotes, and $NAME or ${NAME} replaced by what an earlier NAME=... line gave it. Then it looks at
// what each g++ command would do: which files it compiles, with which flags, into which object
// file, and whether one command links them all, after they are made.

const COMPILERS = new Set(['g++', 'clang++', 'c++'])

function words(line, vars) {
  const out = []
  let word = ''
  let has = false
  let quote = null
  const expand = (i, inDouble) => {
    const m = /^\$(?:\{(\w+)\}|(\w+))/.exec(line.slice(i))
    if (!m) return null
    // A name no line above sets, such as the variable of a loop, is kept as written.
    const value = vars[m[1] ?? m[2]] ?? m[0]
    return { value, length: m[0].length, inDouble }
  }
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quote === "'") {
      if (c === "'") quote = null
      else word += c
      continue
    }
    if (quote === '"') {
      if (c === '"') quote = null
      else if (c === '$' && expand(i)) {
        const e = expand(i)
        word += e.value
        i += e.length - 1
      } else word += c
      continue
    }
    if (c === "'" || c === '"') {
      quote = c
      has = true
      continue
    }
    if (/\s/.test(c)) {
      if (has || word) out.push(word)
      word = ''
      has = false
      continue
    }
    if (c === '$' && expand(i)) {
      const e = expand(i)
      const parts = e.value.split(/\s+/).filter(Boolean)
      if (parts.length) {
        word += parts[0]
        for (const p of parts.slice(1)) {
          out.push(word)
          word = p
        }
        has = true
      }
      i += e.length - 1
      continue
    }
    word += c
    has = true
  }
  if (has || word) out.push(word)
  return out
}

/** The commands of a shell script, in order: [{ line, words }]. */
function commands(text) {
  const vars = {}
  const found = []
  let ended = false
  const lines = text.replace(/\r\n/g, '\n').replace(/\\\n/g, ' ').split('\n')
  lines.forEach((raw, i) => {
    const line = raw.replace(/(^|\s)#.*$/, '$1').trim()
    if (!line || ended) return
    for (const part of line.split(/\s*(?:&&|;)\s*/)) {
      const assign = /^(\w+)=(.*)$/.exec(part)
      if (assign) {
        const w = words(assign[2], vars)
        vars[assign[1]] = w.join(' ')
        continue
      }
      const w = words(part, vars)
      // sh stops at exit, so nothing after it runs.
      if (w[0] === 'exit') ended = true
      else if (w.length) found.push({ line: i + 1, words: w, text: part })
    }
  })
  return found
}

const norm = (p) => p.replace(/^\.\//, '')

async function judgeBuild(t) {
  const name = (n) => `build.sh: ${n}`
  const text = await readFile(join(t.workspace, 'build.sh'), 'utf8').catch(() => null)
  if (text === null) return [fail(name('build.sh is there'), 'Check cannot find build.sh in the workspace folder. It is in the starter; Reset brings it back.')]
  const starter = await readFile(t.chapterPath('starter/build.sh'), 'utf8')
  const flat = (l) => l.trim().replace(/\s+/g, ' ')
  const have = new Set(text.replace(/\r\n/g, '\n').split('\n').map(flat))
  if (!text.split('\n').some((l) => /^\s*#\s*Task 4\b/i.test(l))) {
    return [fail(name('build.sh keeps its task'), 'Check cannot find the # Task 4 comment in build.sh. Put it back on a line of its own, above the lines you write.')]
  }
  const given = starter.split('\n').map(flat).filter((l) => l && !l.startsWith('#'))
  const lost = given.find((l) => !have.has(l))
  if (lost) {
    const why = lost.startsWith('cd ')
      ? 'It moves into the folder build.sh is in, so the paths in it work from wherever it is run.'
      : lost.startsWith('set -e')
        ? 'It stops the script at the first step that fails, so the link never runs on object files left over from an older build.'
        : lost.startsWith('FLAGS=')
          ? 'Every compile line takes its flags from it.'
          : lost.startsWith('mkdir')
            ? 'It makes the build folder the object files go into.'
            : 'The lines you write go with it.'
    return [fail(name('build.sh keeps its given lines'), `The line ${lost} is gone from build.sh, or changed. ${why} Put it back as the starter had it.`)]
  }

  const cmds = commands(text).filter((c) => COMPILERS.has(c.words[0]))
  const compiles = []
  const links = []
  for (const c of cmds) {
    const w = c.words.slice(1)
    const out = w.indexOf('-o') === -1 ? null : w[w.indexOf('-o') + 1]
    const glued = w.find((x) => /^-\S+\s+-/.test(x))
    if (glued) {
      return [fail(name('each flag is a word of its own'), `Line ${c.line} hands the compiler ${quoted(glued)} as one word: a variable inside double quotes stays one word, so the compiler reads all the flags as one it does not know. Write the variable without quotes, as the given line does.`)]
    }
    const headers = w.filter((x) => /\.h$/.test(x))
    if (headers.length) {
      return [fail(name('no header is compiled'), `Line ${c.line} hands the compiler ${headers.join(' and ')}. A header is never compiled on its own: the .cpp files that include it bring it in.`)]
    }
    const files = w.filter((x) => /\.cpp$/.test(x)).map(norm)
    const objects = w.filter((x, i) => /\.o$/.test(x) && w[i - 1] !== '-o').map(norm)
    const globs = objects.filter((x) => x.includes('*'))
    const flags = w.filter((x) => x.startsWith('-') && x !== '-o' && x !== '-c')
    const entry = { line: c.line, files, objects: objects.filter((x) => !x.includes('*')), globs, out: out && norm(out), flags, compile: w.includes('-c') }
    ;(entry.compile ? compiles : links).push(entry)
  }

  const all = SOURCES.map((s) => s)
  for (const c of compiles) {
    for (const f of c.files) {
      if (f.includes('$')) {
        return [fail(name('one line for each file'), `Line ${c.line} compiles ${f}, a name with a variable in it that no line above sets, such as the name of a loop. Check reads each line as written: write one line for each .cpp file, with its name in full, as the given line does.`)]
      }
      if (!all.includes(f)) {
        const base = f.split('/').at(-1)
        const meant = all.find((s) => s.endsWith(`/${base}`))
        return [fail(name('every path is from the workspace folder'), `Line ${c.line} compiles ${f}, and there is no such file from the folder build.sh works in: its cd line moves into the workspace folder, where build.sh is.${meant ? ` That file is ${meant} from there.` : ''} So build.sh works from any folder, and only with paths written from the workspace folder.`)]
      }
    }
    if (!c.files.length && c.objects.length) {
      return [fail(name('the link line has no -c'), `Line ${c.line} hands the compiler object files with -c. -c stops before linking, so that line makes no program: the link line is the one line without -c.`)]
    }
    if (c.files.length !== 1) {
      return [fail(name('one file per compile line'), `Line ${c.line} compiles ${c.files.length ? c.files.join(' and ') : 'no .cpp file'} with -c. Each compile line takes one .cpp file into its own object file: with -o, the compiler takes one file only.`)]
    }
    if (!c.out || !/\.o$/.test(c.out)) {
      return [fail(name('each file becomes an object file'), `Line ${c.line} compiles ${c.files[0]} without -o and a name ending in .o after it. Each compile line names the object file it makes, so the link line can name it too.`)]
    }
  }
  for (const s of all) {
    const n = compiles.filter((c) => c.files[0] === s)
    const bare = links.find((l) => l.files.includes(s))
    if (!n.length && bare) {
      return [
        fail(
          name('every .cpp file is compiled'),
          `Line ${bare.line} hands ${s} to the compiler without -c. Without -c, the compiler compiles and links in one go, so ${bare.out === 'daybook' ? 'that file is compiled again from the start on every link, and no object file of its own is made' : 'it tries to make a whole program from that one file, without the functions of the other files'}. Each .cpp file is compiled on a line of its own, with -c, into its own object file.`
        )
      ]
    }
    if (!n.length) {
      return [fail(name('every .cpp file is compiled'), `No line of build.sh compiles ${s} with -c into an object file. Every .cpp file of the program is compiled on its own; left out, its functions are missing when the program is linked, and the linker says something like "Undefined symbols" or "undefined reference to".`)]
    }
    if (n.length > 1) return [fail(name('every .cpp file is compiled once'), `${s} is compiled on more than one line of build.sh: lines ${n.map((c) => c.line).join(' and ')}. Once is enough.`)]
  }
  const outs = compiles.map((c) => c.out)
  const twice = outs.find((o, i) => outs.indexOf(o) !== i)
  if (twice) return [fail(name('each object file is its own'), `Two compile lines write the same object file, ${twice}, so the second takes the place of the first. Each .cpp file gets an object file of its own.`)]
  for (const c of compiles) {
    for (const flag of ['-std=c++17', '-Wall', '-Wextra']) {
      if (c.flags.includes(flag)) continue
      const onLink = links.some((l) => l.flags.includes(flag))
      return [
        fail(
          name('every compile line has the flags'),
          `The line that compiles ${c.files[0]} has no ${flag}.${onLink ? ` It is on the link line instead, where it does nothing: linking joins object files, and the compiler reads the code only when it compiles.` : ''} A flag that says how the code is read, or what to warn about, goes on every compile line: the given line takes them from $FLAGS.`
        )
      ]
    }
  }

  const finals = links.filter((l) => l.out && l.out.split('/').at(-1) === 'daybook')
  if (!finals.length) {
    return [fail(name('one line links the program'), links.length ? `No line of build.sh makes the program daybook: the link line ends with -o and the program's name, daybook, so it lands in the workspace folder.` : 'No line of build.sh links the object files into the program. After the compile lines comes one line, without -c, that hands the compiler every object file and names the program with -o daybook.')]
  }
  const link = finals.at(-1)
  if (link.out !== 'daybook') return [fail(name('the program lands in the workspace folder'), `The link line makes ${link.out}. The program is daybook, in the workspace folder, where ./daybook runs it.`)]
  if (link.files.length) return [fail(name('the link line links object files'), `The link line on line ${link.line} hands the compiler ${link.files.join(' and ')}, which compiles ${link.files.length > 1 ? 'them' : 'it'} again from the start. Linking joins the object files the lines above made; a .cpp file that changed is compiled by its own line.`)]
  // A pattern such as build/*.o stands for every object file it matches, as sh would expand it.
  const matches = (glob, o) => new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')}$`).test(o)
  link.objects.push(...outs.filter((o) => !link.objects.includes(o) && link.globs.some((g) => matches(g, o))))
  const missing = outs.filter((o) => !link.objects.includes(o))
  if (missing.length) {
    return [fail(name('the link line has every object file'), `The link line leaves out ${missing.join(' and ')}. Every object file is linked into the program; without ${missing.length > 1 ? 'them' : 'it'}, what ${missing.length > 1 ? 'they hold is' : 'it holds is'} missing, and the linker says something like "Undefined symbols" or "undefined reference to".`)]
  }
  const stray = link.objects.filter((o) => !outs.includes(o))
  if (stray.length) return [fail(name('the link line has only object files it made'), `The link line hands the compiler ${stray.join(' and ')}, which no line of build.sh makes. Compare each name with the -o of its compile line.`)]
  const late = compiles.find((c) => c.line > link.line)
  if (late) return [fail(name('compiling comes before linking'), `${late.files[0]} is compiled on line ${late.line}, after the link line on line ${link.line}. The script runs from the top, so the link would join an object file that is not made yet, or an old one.`)]

  return [
    pass(name('every .cpp file is compiled on its own into an object file'), compiles.map((c) => `line ${c.line}: ${c.files[0]} into ${c.out}`).join('\n')),
    pass(name('every compile line has -std=c++17 -Wall -Wextra')),
    pass(name('one line, after them, links every object file into daybook'), `line ${link.line}: ${link.objects.join(' ')} into ${link.out}`)
  ]
}

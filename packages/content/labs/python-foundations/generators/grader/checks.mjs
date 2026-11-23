import { classCases, pyLiteral, tuple, valueRunCause } from '../../grading.mjs'

const FILE = 'log_reader.py'
const s = JSON.stringify

const EXPLAIN = (error) => {
  const m = error.message
  if (/^list index out of range$/.test(m)) {
    return 'the line asks for a position the list does not have. A list with nothing in it has no first item at all, which is what a search that finds nothing gives'
  }
  if (/^'(list|tuple)' object is not an iterator$/.test(m)) {
    return 'next takes a generator, which hands over its items one at a time, and here it was given a list. A list has every item already and is not asked for the next one'
  }
  if (/^'str' object is not an iterator$/.test(m)) {
    return 'next was given text, one line, not something that hands over lines one at a time'
  }
  return valueRunCause(error)
}

// Check's own file reader stands in for open: it counts how many lines of the file the code has
// taken when the first one comes out, notes the encoding, and whether the file was closed.
const WATCH = (path, lines) => `import builtins, io, os
with open(${s(path)}, "w", encoding="utf-8") as f:
    f.write("".join(line + "\\n" for line in ${pyLiteral(lines)}))
class Watched:
    def __init__(self, f, encoding):
        self.f, self.encoding, self.taken = f, encoding, 0
    def __enter__(self):
        return self
    def __exit__(self, *exc):
        self.f.close()
        return False
    def __iter__(self):
        return self
    def __next__(self):
        line = next(self.f)
        self.taken += 1
        return line
    def readline(self, *args):
        line = self.f.readline(*args)
        self.taken += 1 if line else 0
        return line
    def read(self, *args):
        text = self.f.read(*args)
        self.taken += text.count("\\n")
        return text
    def readlines(self, *args):
        found = self.f.readlines(*args)
        self.taken += len(found)
        return found
    def close(self):
        self.f.close()
    @property
    def closed(self):
        return self.f.closed
    def __getattr__(self, name):
        return getattr(self.f, name)
opened = []
real_open = builtins.open
def watched_open(file, mode="r", *args, **kwargs):
    encoding = kwargs.get("encoding", args[1] if len(args) > 1 else None)
    f = Watched(real_open(file, mode, *args, **kwargs), encoding)
    opened.append(f)
    return f
builtins.open = io.open = watched_open
def lines_read():
    return opened[0].taken if opened else None`

// Lines handed over one at a time, counting how many were taken.
const SOURCE = (lines) => `class Source:
    def __init__(self, lines):
        self.lines, self.taken = list(lines), 0
    def __iter__(self):
        return self
    def __next__(self):
        if self.taken == len(self.lines):
            raise StopIteration
        self.taken += 1
        return self.lines[self.taken - 1]
source = Source(${pyLiteral(lines)})`

const kindOf = (v, fn, what) =>
  v === 'list'
    ? `${fn} gives back a list: it went through every ${what} before it gave back the first. The task asks for a generator, which gives the next ${what} only when it is asked for one.`
    : v === 'str'
      ? `${fn} gives back one ${what}, as text, not a generator. return gives back once and ends the function; a generator gives its items one at a time with yield.`
      : v === 'NoneType'
        ? `${fn} gives back None. A generator function has yield in it, and calling it gives back a generator.`
        : `${fn} gives back ${v === 'tuple' ? 'a tuple' : `a ${v}`}, not a generator.`

const isGenerator = (name, fn, what) => ({
  code: `hasattr(${name}, "__next__") or type(${name}).__name__`,
  want: true,
  hidden: `# Check asks whether ${name} hands over its ${what}s one at a time`,
  hint: (v) => kindOf(v, fn, what)
})

const early = (fn, n, total, what, of) => (v) =>
  v === null
    ? `${fn} gave back a line without opening the file at the path it was given.`
    : `When the first ${what} came out, ${fn} had already read ${v} of the ${total} ${of}: it did the work too early. A generator reads the next ${what} only when it is asked for one, so a big log is never all in memory at once.`

function linesSteps(path, lines) {
  return [
    { code: WATCH(path, lines), hidden: `# Check writes ${path}, ${lines.length} lines of its own, and watches how it is read` },
    { code: `lines = log_lines(${s(path)})` },
    isGenerator('lines', 'log_lines', 'line'),
    { code: 'first = next(lines)' },
    {
      code: 'os.path.basename(opened[0].name) if opened else None',
      want: path,
      hidden: '# Check asks which file was opened',
      hint: (v) =>
        v === null
          ? 'log_lines gave a line without opening a file with open.'
          : `log_lines opened ${v}, not the file at the path it was given. Open the path the function is given: a file name written into the code opens the same file whatever path Check gives.`
    },
    {
      code: 'first',
      want: lines[0],
      hint: (v) =>
        v === `${lines[0]}\n`
          ? 'The line still has its line end, \\n, at its end. The task asks for each line without it.'
          : typeof v === 'string' && v.trim() === lines[0]
            ? 'The line has spaces or a line end around it. The task asks for each line exactly as in the file, without its line end.'
            : 'The first line log_lines gives is not the first line of the file.'
    },
    { code: 'lines_read()', want: 1, hint: early('log_lines', 1, lines.length, 'line', 'lines of the file') },
    {
      code: '(opened[0].encoding or "").lower().replace("_", "-") in ("utf-8", "utf8")',
      want: true,
      hidden: '# Check asks how the file was opened',
      hint: `log_lines opens ${path} without encoding="utf-8". Without it Python reads with the computer's own encoding, which is not UTF-8 on many Windows computers, so a letter such as é comes out wrong there. The task asks for it.`
    },
    {
      code: 'list(lines)',
      want: lines.slice(1),
      hint: 'The rest of the lines, after the first, are not every other line of the file in order, each without its line end.'
    },
    {
      code: 'list(lines)',
      want: [],
      hint: 'A second loop over what log_lines gave back found lines again. A generator is used up once it has given everything.'
    },
    {
      code: 'opened[0].closed',
      want: true,
      hidden: '# Check asks whether the file was closed once every line was read',
      hint: `log_lines left ${path} open after its last line. A file opened on a with line inside the generator is closed when the lines under it end.`
    },
    { code: `again = log_lines(${s(path)})` },
    { code: 'next(again)', value: true },
    { code: 'again.close()', hidden: '# Check stops the generator after its first line, as a loop that ends early with break does' },
    {
      code: 'opened[-1].closed',
      want: true,
      hidden: '# Check asks whether the file was closed when the generator was stopped',
      hint: `log_lines left ${path} open when it was stopped after its first line. A with line inside the generator closes the file when the generator is stopped early too; a close() after the loop runs only when every line was read.`
    }
  ]
}

function teamSteps(lines, sign) {
  const mine = lines.filter((l) => l.split(' ')[1] === `${sign}:`)
  const first = lines.indexOf(mine[0]) + 1
  return [
    { code: SOURCE(lines), hidden: `# Check makes source, ${lines.length} lines of its own handed over one at a time, counting each` },
    { code: `found = from_team(source, ${s(sign)})` },
    isGenerator('found', 'from_team', 'line'),
    {
      code: 'next(found, None)',
      want: mine[0],
      hint: (v) =>
        v === null
          ? `from_team gave no line at all, though ${mine.length} of the lines are from ${sign}. Look at how your code finds the call sign of a line: it is the second word, with a colon at its end.`
          : typeof v === 'string' && v.includes(sign)
          ? `The first line from_team gives mentions ${sign}, but its call sign is another team's. The task asks for the lines whose call sign, the word after the time, is ${sign}.`
          : `The first line from_team gives is not the first line from ${sign}.`
    },
    { code: 'source.taken', want: first, hint: early('from_team', first, lines.length, 'line', 'lines') },
    {
      code: 'list(found)',
      want: mine.slice(1),
      hint: (v) =>
        Array.isArray(v) && v.length > mine.length - 1
          ? `from_team gives lines from other teams too: a line that only mentions ${sign} in its message is not from ${sign}.`
          : `The rest of the lines from_team gives are not the other lines from ${sign}, in order.`
    },
    { code: 'list(found)', want: [], hint: 'A second loop over what from_team gave back found lines again. A generator is used up once it has given everything.' }
  ]
}

function mentionSteps(lines, word, missing) {
  const at = lines.findIndex((l) => l.includes(word))
  return [
    { code: SOURCE(lines), hidden: `# Check makes source, ${lines.length} lines of its own handed over one at a time, counting each` },
    {
      code: `first_mention(source, ${s(word)})`,
      want: lines[at],
      hint: (v) =>
        Array.isArray(v)
          ? 'first_mention gives back a list of every line with the word in it. The task asks for the first one only.'
          : v === null
            ? 'first_mention gives back None, though a line has the word in it.'
            : typeof v === 'string'
              ? 'first_mention does not give back the first line that has the word in it.'
              : 'first_mention gives back something that is not a line, such as a generator that was never asked for its first item.'
    },
    {
      code: 'source.taken',
      want: at + 1,
      hint: (v) => `first_mention read ${v} of the ${lines.length} lines, though the line it gives back is number ${at + 1}: it went on reading after it had its answer. The task asks it to read no line after that one.`
    },
    { code: SOURCE(lines).replace('source = ', 'again = '), hidden: '# Check makes the same lines again' },
    {
      code: `first_mention(again, ${s(missing)})`,
      want: null,
      hint: (v) =>
        Array.isArray(v)
          ? 'For a word that is in no line, first_mention gives back an empty list. The task asks for None.'
          : 'For a word that is in no line, first_mention does not give back None.'
    }
  ]
}

function totalSteps(cases) {
  return cases.flatMap(({ hours, gen }) => {
    const want = tuple(Math.max(...hours), hours.reduce((a, b) => a + b, 0))
    const name = gen ? 'hours' : null
    return [
      ...(gen ? [{ code: `hours = (n for n in ${pyLiteral(hours)})` }] : []),
      {
        code: `longest_and_total(${name ?? pyLiteral(hours)})`,
        want,
        hint: (v) => {
          const [big, total] = v?.['@tuple'] ?? []
          if (v === null) return 'longest_and_total gives back None: it ends without return.'
          if (!v?.['@tuple']) return 'longest_and_total does not give back a tuple of two numbers.'
          if (gen && big === want['@tuple'][0] && total === 0) {
            return 'With a generator, the total is 0. The first loop over the generator, to find the largest, used it up, so the second found nothing to add. A generator gives its items only once.'
          }
          if (big !== want['@tuple'][0]) return 'The first number of the tuple is not the largest number of hours.'
          return 'The second number of the tuple is not the total of the hours.'
        }
      }
    ]
  })
}

const options = (task, fn, list) => ({ file: FILE, task, explain: EXPLAIN, names: { [fn]: 'function' }, list })

export const checks = {
  lines(t) {
    return classCases(t, options(1, 'log_lines', [
      {
        name: 'A log of six lines',
        steps: linesSteps('check_log.txt', [
          '06:10 Delta: leaving base',
          '06:55 Echo: at Glas Tholl',
          '07:20 Delta: snow to the knee',
          '08:05 Golf: two walkers seen',
          '08:40 Echo: found them, both cold',
          '09:30 Delta: back at base'
        ])
      },
      {
        name: 'A log of four other lines',
        steps: linesSteps('night_log.txt', [
          '23:15 Foxtrot: on the ridge',
          '23:50 Golf: torch seen below Meikle Pap',
          '00:20 Foxtrot: path blocked by a fall',
          '01:05 Golf: all safe, coming in'
        ])
      }
    ]))
  },

  team(t) {
    return classCases(t, options(2, 'from_team', [
      {
        name: 'The lines of one team among three',
        steps: teamSteps([
          '06:10 Echo: leaving base',
          '06:55 Golf: meeting Delta at the hut',
          '07:20 Delta: at the hut',
          '08:05 Echo: snow to the knee',
          '08:40 Delta: two walkers found',
          '09:30 Golf: on our way to Delta',
          '10:15 Delta: back at base'
        ], 'Delta')
      },
      {
        name: 'The lines of another team',
        steps: teamSteps([
          '23:15 Foxtrot: on the ridge',
          '23:50 Foxtrot: torch seen below Meikle Pap',
          '00:20 Echo: Foxtrot asks for a rope',
          '01:05 Foxtrot: path blocked by a fall',
          '01:40 Echo: rope on its way'
        ], 'Foxtrot')
      }
    ]))
  },

  mention(t) {
    return classCases(t, options(3, 'first_mention', [
      {
        name: 'The first line with a word, then a word in no line',
        steps: mentionSteps([
          '06:10 Echo: leaving base',
          '06:55 Golf: at the hut',
          '07:20 Delta: rope frayed, need a spare',
          '08:05 Echo: snow to the knee',
          '08:40 Delta: spare rope here',
          '09:30 Golf: back at base'
        ], 'rope', 'helicopter')
      },
      {
        name: 'Another word, found in the first line',
        steps: mentionSteps([
          '23:15 Foxtrot: torch seen on the ridge',
          '23:50 Golf: on our way',
          '00:20 Foxtrot: torch gone out',
          '01:05 Golf: all safe'
        ], 'torch', 'stretcher')
      }
    ]))
  },

  total(t) {
    return classCases(t, options(4, 'longest_and_total', [
      { name: 'A list of hours', steps: totalSteps([{ hours: [4, 11, 7] }, { hours: [5] }]) },
      { name: 'Hours from a generator', steps: totalSteps([{ hours: [6, 2, 9, 3], gen: true }]) },
      { name: 'A generator with one number in it', steps: totalSteps([{ hours: [8], gen: true }]) }
    ]))
  }
}

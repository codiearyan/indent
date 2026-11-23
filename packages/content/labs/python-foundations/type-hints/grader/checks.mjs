import { classCases, pyLiteral, tuple, valueRunCause } from '../../grading.mjs'

const FILE = 'season_report.py'
const s = JSON.stringify

const EXPLAIN = (error) => {
  const m = error.message
  if (/^unsupported operand type\(s\) for -: 'str' and 'str'$/.test(m)) {
    return '- cannot take one text from another. Python ran the function with the values it was given, whatever its hints say'
  }
  if (/^bad operand type for unary -: 'str'$/.test(m)) {
    return 'a minus sign was put in front of text. Values read from a file are text until int() turns them into a whole number, and the Callout class\'s hint that hours is a whole number does not do that: Python does not check hints'
  }
  if (/^'(dict|list)' object has no attribute '(hill|hours|date)'$/.test(m)) {
    return 'the rule was handed something that is not one callout. A rule takes one Callout at a time'
  }
  if (/^not enough values to unpack|^too many values to unpack/.test(m)) {
    return `${m.startsWith('not') ? 'fewer' : 'more'} values came out of a line of the file than there are names to take them. Each line holds three values, date, hill and hours, split at its commas`
  }
  return valueRunCause(error)
}

// Reads what Python keeps for a function's hints and gives one name for each kind, the same for
// every way of writing it: list[int] and typing.List[int], Optional[str], Union[str, None] and
// str | None, a hint written as text, and str | None in text on a Python that cannot run it.
const READER = `import ast, collections.abc, inspect, sys, typing
def kind_name(t, g):
    if isinstance(t, str):
        return text_name(t, g)
    if isinstance(t, typing.ForwardRef):
        return text_name(t.__forward_arg__, g)
    if t is None or t is type(None):
        return "None"
    origin, args = typing.get_origin(t), typing.get_args(t)
    if origin is typing.Union or type(t).__name__ == "UnionType":
        names = [kind_name(a, g) for a in args]
        rest = sorted(n for n in names if n != "None")
        if "None" in names and len(rest) == 1:
            return "Optional[" + rest[0] + "]"
        return "Union[" + ", ".join(rest + ["None"] * ("None" in names)) + "]"
    if origin is collections.abc.Callable:
        if len(args) == 2 and isinstance(args[0], list):
            return "Callable[[" + ", ".join(kind_name(a, g) for a in args[0]) + "], " + kind_name(args[1], g) + "]"
        return "Callable"
    if origin is not None:
        base = getattr(origin, "__name__", str(origin))
        return base + ("[" + ", ".join(kind_name(a, g) for a in args) + "]" if args else "")
    if isinstance(t, list):
        return "[" + ", ".join(kind_name(a, g) for a in t) + "]"
    return getattr(t, "__name__", repr(t))
class Bars(ast.NodeTransformer):
    def visit_BinOp(self, node):
        self.generic_visit(node)
        if isinstance(node.op, ast.BitOr):
            union = ast.Attribute(value=ast.Name(id="typing_", ctx=ast.Load()), attr="Union", ctx=ast.Load())
            return ast.Subscript(value=union, slice=ast.Tuple(elts=[node.left, node.right], ctx=ast.Load()), ctx=ast.Load())
        return node
def text_name(text, g):
    try:
        tree = Bars().visit(ast.parse(text, mode="eval"))
        ast.fix_missing_locations(tree)
        return kind_name(eval(compile(tree, "<hint>", "eval"), dict(g, typing_=typing)), g)
    except Exception:
        return "not a kind Python knows: " + text
def hints(fn):
    notes = getattr(fn, "__annotations__", None) or {}
    try:
        names = list(inspect.signature(fn).parameters)
    except (TypeError, ValueError):
        names = [name for name in notes if name != "return"]
    found = {name: kind_name(notes[name], fn.__globals__) if name in notes else None for name in names}
    found["return"] = kind_name(notes["return"], fn.__globals__) if "return" in notes else None
    return found`

const WORDS = {
  int: 'a whole number',
  str: 'text',
  bool: 'True or False',
  list: 'a list, without what is in it',
  'list[int]': 'a list of whole numbers',
  'list[str]': 'a list of text',
  'dict[str, str]': 'a dictionary from text to text',
  dict: 'a dictionary, without what its keys and values are',
  'Optional[str]': 'text or None',
  'Callable[[Callout], bool]': 'a function from one Callout to True or False',
  Callable: 'a function, without what it takes and gives back',
  'list[Callout]': 'a list of Callout',
  Callout: 'one Callout'
}
const words = (kind) => WORDS[kind] ?? (kind?.startsWith('not a kind') ? `a name Python does not know (${kind.slice(26)})` : kind)

const fromDict = (v) => Object.fromEntries((v?.['@dict'] ?? []).map(([k, x]) => [k, x]))

/**
 * The words for the first hint in `got` that is not what `want` says, or a general message. The
 * parameters are matched by their place in the def line, not their names, which the task leaves
 * open: `got` holds the learner's names in that order, then "return".
 */
function hintWords(fn, want, got, extra = {}) {
  const have = Object.entries(fromDict(got))
  const params = have.filter(([k]) => k !== 'return')
  const asked = Object.entries(want).filter(([k]) => k !== 'return')
  if (have.every(([, k]) => k === null)) {
    return `Python keeps no hints for ${fn}. A hint is written in the def line itself: a colon and the kind after a parameter's name, and -> and the kind before the colon at its end. A comment is not a hint, and Python keeps nothing of it.`
  }
  for (const [i, [task, kind]] of [...asked, ['return', want.return]].entries()) {
    const back = task === 'return'
    const [name, mine] = back ? ['return', fromDict(got).return ?? null] : params[i] ?? []
    if (name === undefined) return `${fn} takes fewer values than the task says. Its def line needs a parameter for each of them.`
    const what = back ? `what ${fn} gives back` : name
    if (mine === null) {
      if (back) return `${fn} has no hint for what it gives back. That hint is written after ->, between the round brackets and the colon of the def line.`
      const other = params.find(([, k], j) => j !== i && k !== null && j >= asked.length)
      return `${fn} has no hint on ${name}.${other ? ` It has one on ${other[0]}, which the task does not ask for.` : ''}`
    }
    if (mine !== kind) {
      const own = extra[task]?.(mine, name)
      if (own) return own
      return `The hint on ${what} says ${words(mine)}, and the task says ${back ? 'it gives back' : `${name} is`} ${words(kind)}.`
    }
  }
  if (params.length > asked.length) return `${fn} takes more values than the task says. Its def line has a parameter for each value the task names, and no others.`
  return `The hints of ${fn} are not the ones the task asks for.`
}

const hintStep = (fn, want, extra) => [
  { code: `hints(${fn})`, value: true },
  {
    code: `list(hints(${fn}).values())`,
    want: [...Object.entries(want).filter(([k]) => k !== 'return').map(([, k]) => k), want.return],
    hidden: `# Check compares each hint of ${fn}, in the order of its def line, with what the task asks`,
    hint: (v, seen) => hintWords(fn, want, seen[seen.length - 2], extra)
  }
]

const READ = { code: READER, hidden: '# Check makes hints, which reads the hints Python keeps for a function, one name for each kind' }

function totalSteps(cases) {
  return [
    READ,
    ...cases.map((hours) => ({
      code: `total_hours(${pyLiteral(hours)})`,
      want: hours.reduce((a, b) => a + b, 0),
      hint: (v) => (v === null ? 'total_hours gives back None: it ends without return.' : 'total_hours does not give back the total of the numbers.')
    })),
    ...hintStep('total_hours', { hours: 'list[int]', return: 'int' })
  ]
}

const BELIEVED = {
  start: (mine) => (mine === 'str' ? 'The hint on start still says text. Python ran hours_between with whole numbers all the same, because it does not check hints while the program runs: they are notes for the people and the editor that read the code, so a wrong one misleads them.' : null),
  end: (mine) => (mine === 'str' ? 'The hint on end still says text, and end is a whole number.' : null),
  return: (mine) => (mine === 'str' ? 'The hint for what hours_between gives back still says text, and it gives back a whole number.' : null)
}

function betweenSteps(pairs) {
  return [
    READ,
    ...pairs.map(([a, b]) => ({
      code: `hours_between(${a}, ${b})`,
      want: b - a,
      hint: 'hours_between no longer gives back the end take away the start. The task asks to correct its hints only, and leave what it does as it was.'
    })),
    ...hintStep('hours_between', { start: 'int', end: 'int', return: 'int' }, BELIEVED)
  ]
}

function leaderSteps(table, found, missing) {
  return [
    READ,
    { code: `leaders = ${pyLiteral(table)}`, value: false },
    {
      code: `leader_of(${s(found)}, leaders)`,
      want: table[found],
      hint: (v) => (v === null ? `leader_of gives back None for ${found}, a call sign the dictionary has.` : `leader_of does not give back the leader of ${found}.`)
    },
    {
      code: `leader_of(${s(missing)}, leaders)`,
      want: null,
      hint: (v) => `For a call sign the dictionary does not have, leader_of gives back ${s(v)}. The task asks for None.`
    },
    { code: 'len(leaders)', want: Object.keys(table).length, hidden: true, hint: 'leader_of changed the dictionary it was given.' },
    ...hintStep('leader_of', { call_sign: 'str', leaders: 'dict[str, str]', return: 'Optional[str]' }, {
      return: (mine) => (mine === 'str' ? 'The hint for what leader_of gives back says text, and it gives back None too, for a call sign the dictionary does not have. A hint for text or None says both.' : null)
    })
  ]
}

const RULE = `seen = []
def rule(callout):
    seen.append(getattr(callout, "hill", callout))
    return getattr(callout, "hours", 0) > 5`

const callouts = (rows) => `[${rows.map(([d, h, n]) => `Callout(${s(d)}, ${s(h)}, ${n})`).join(', ')}]`

function pickSteps(rows) {
  const kept = rows.filter((r) => r[2] > 5).map(([, h, n]) => tuple(h, n))
  return [
    READ,
    { code: RULE, hidden: '# Check makes rule, a function of its own that says True for a callout of more than 5 hours, and notes each callout it is given' },
    { code: `season = ${callouts(rows)}`, hidden: `# Check makes season, a list of ${rows.length} Callout objects of its own` },
    { code: 'chosen = pick(season, rule)' },
    {
      code: 'type(chosen).__name__',
      want: 'list',
      hidden: '# Check asks what kind of value pick gave back',
      hint: (v) =>
        v === 'NoneType'
          ? 'pick gives back None: it ends without return.'
          : v === 'filter' || v === 'generator'
            ? `pick gives back a ${v}, which has not gone through the callouts yet: it would ask the rule only when something loops over it. The task asks for a new list.`
            : `pick gives back a ${v}, and the task asks for a new list.`
    },
    {
      code: 'seen',
      want: rows.map((r) => r[1]),
      hint: (v) =>
        !Array.isArray(v) || v.length === 0
          ? 'rule was never called. A function handed in runs only when your code calls it, with round brackets and one callout in them.'
          : v.every((x) => Array.isArray(x))
            ? 'rule was handed the whole list. It takes one callout at a time, and the task asks to call it with each callout in turn.'
            : 'rule was not called once for each callout, in order.'
    },
    {
      code: '[(c.hill, c.hours) for c in chosen] if isinstance(chosen, list) else type(chosen).__name__',
      want: kept,
      hint: (v) =>
        typeof v === 'string'
          ? `pick gives back ${v === 'NoneType' ? 'None' : `a ${v}`}, and the task asks for a new list.`
          : 'pick does not give back the callouts the rule gave True for, in their order.'
    },
    { code: 'len(season)', want: rows.length, hidden: true, hint: 'pick changed the list it was given.' },
    ...hintStep('pick', { callouts: 'list[Callout]', rule: 'Callable[[Callout], bool]', return: 'list[Callout]' }, {
      rule: (mine, name) => (mine === 'Callable' ? `The hint on ${name} says a function, but not what it takes and gives back. The task says it takes one Callout and gives back True or False.` : null)
    })
  ]
}

// Check's own file reader stands in for open, to see how the file was opened and closed.
const WATCH = (path, rows) => `import builtins, io, os
with open(${s(path)}, "w", encoding="utf-8", newline="") as f:
    f.write("".join(",".join(map(str, row)) + "\\n" for row in ${pyLiteral(rows.map((r) => tuple(...r)))}))
opened = []
real_open = builtins.open
def watched_open(file, mode="r", *args, **kwargs):
    encoding = kwargs.get("encoding", args[1] if len(args) > 1 else None)
    f = real_open(file, mode, *args, **kwargs)
    opened.append((os.path.basename(str(file)), encoding, f))
    return f
builtins.open = io.open = watched_open`

function longestSteps(path, rows, counts) {
  const order = [...rows].sort((a, b) => b[2] - a[2] || (a[0] < b[0] ? -1 : 1))
  const show = (list) => list.map(([d, h, n]) => tuple(d, h, n))
  const newestFirst = [...rows].sort((a, b) => b[2] - a[2] || (a[0] < b[0] ? 1 : -1))
  const fewest = [...rows].sort((a, b) => a[2] - b[2] || (a[0] < b[0] ? -1 : 1))
  return [
    READ,
    { code: WATCH(path, rows), hidden: `# Check writes ${path}, ${rows.length} callouts of its own, and watches how it is opened` },
    { code: `best = longest_callouts(${s(path)}, ${counts[0]})` },
    {
      code: 'opened[0][0] if opened else None',
      want: path,
      hidden: '# Check asks which file was opened',
      hint: (v) => (v === null ? 'longest_callouts gave back callouts without opening the file at the path it was given.' : `longest_callouts opened ${v}, not the file at the path it was given. Open the path the function is given.`)
    },
    {
      code: '(opened[0][1] or "").lower().replace("_", "-") in ("utf-8", "utf8")',
      want: true,
      hidden: '# Check asks how the file was opened',
      hint: `longest_callouts opens ${path} without encoding="utf-8". Without it Python reads with the computer's own encoding, which is not UTF-8 on many Windows computers. The task, like every file task before it, asks for it.`
    },
    { code: 'opened[0][2].closed', want: true, hidden: '# Check asks whether the file was closed', hint: `longest_callouts left ${path} open after it returned. A file opened on a with line is closed when the lines under it end.` },
    {
      code: 'sorted({type(c).__name__ for c in best}) if isinstance(best, list) else type(best).__name__',
      want: ['Callout'],
      hidden: '# Check asks what kind of values longest_callouts gave back',
      hint: (v) =>
        typeof v === 'string'
          ? `longest_callouts gives back ${v === 'NoneType' ? 'None' : `a ${v}`}, and the task asks for a list of Callout objects.`
          : `longest_callouts gives back a list of ${v.map((k) => ({ dict: 'dictionaries', tuple: 'tuples', list: 'lists', str: 'text' })[k] ?? k).join(' and ')}, and the task asks for Callout objects, made with the Callout class at the top of the file.`
    },
    {
      code: '[(c.date, c.hill, c.hours) for c in best]',
      want: show(order.slice(0, counts[0])),
      hint: (v) => {
        if (Array.isArray(v) && v.some((t) => typeof t?.['@tuple']?.[2] === 'string')) {
          return 'The hours of the callouts longest_callouts gives back are text, as they are in the file. The task asks for each callout\'s hours as a whole number: the Callout class\'s hint does not turn text into one, because Python does not check hints, and int() does.'
        }
        if (s(v) === s(show(newestFirst.slice(0, counts[0])))) return 'Of two callouts with the same hours, the newer comes first. The task asks for the older first.'
        if (s(v) === s(show(fewest.slice(0, counts[0])))) return 'longest_callouts gives the fewest hours first, and the task asks for the most hours first.'
        if (Array.isArray(v) && v.length !== counts[0]) return `longest_callouts gives back ${v.length} callouts, and the task asks for ${counts[0]}.`
        return 'longest_callouts does not give back the callouts with the most hours, the most first, and of two with the same hours the older first.'
      }
    },
    {
      code: `len(longest_callouts(${s(path)}, ${counts[1]}))`,
      want: Math.min(counts[1], rows.length),
      hint: (v) => `Asked for ${counts[1]} from a file of ${rows.length} callouts, longest_callouts gives back ${v}. The task asks for at most that many: all of them, when there are fewer.`
    },
    ...hintStep('longest_callouts', { path: 'str', count: 'int', return: 'list[Callout]' })
  ]
}

const options = (task, fn, list) => ({ file: FILE, task, explain: EXPLAIN, names: { [fn]: 'function' }, list })

export const checks = {
  total(t) {
    return classCases(t, options(1, 'total_hours', [
      { name: 'Totals, and the hints', steps: totalSteps([[4, 11, 7], [6, 9]]) },
      { name: 'An empty list', steps: totalSteps([[]]) }
    ]))
  },

  between(t) {
    return classCases(t, options(2, 'hours_between', [
      { name: 'What it does, and its hints', steps: betweenSteps([[6, 20], [9, 13], [22, 5]]) }
    ]))
  },

  leader(t) {
    return classCases(t, options(3, 'leader_of', [
      { name: 'A leader, None, and the hints', steps: leaderSteps({ Delta: 'Morven', Echo: 'Fergus', Golf: 'Isla' }, 'Echo', 'Foxtrot') },
      { name: 'Another table', steps: leaderSteps({ Foxtrot: 'Morven', Golf: 'Isla' }, 'Foxtrot', 'Delta') }
    ]))
  },

  pick(t) {
    return classCases(t, options(4, 'pick', [
      {
        name: 'Callouts a rule picks, and the hints',
        steps: pickSteps([
          ['2025-11-03', 'Glas Tholl', 4],
          ['2025-11-09', 'Meikle Pap', 11],
          ['2025-11-15', 'Creag Bheag', 6],
          ['2025-11-20', 'Stob Ruadh', 2],
          ['2025-12-01', 'Black Corrie', 9]
        ])
      },
      {
        name: 'A rule that picks none',
        steps: pickSteps([
          ['2026-01-04', 'Lochan Wood', 3],
          ['2026-01-11', 'Garve Edge', 5]
        ])
      }
    ]))
  },

  longest(t) {
    return classCases(t, options(5, 'longest_callouts', [
      {
        name: 'The three longest of seven, two with the same hours',
        steps: longestSteps('check_season.csv', [
          ['2025-11-09', 'Meikle Pap', 4],
          ['2025-12-20', 'Black Corrie', 11],
          ['2025-11-15', 'Creag Bheag', 9],
          ['2025-11-20', 'Stob Ruadh', 11],
          ['2025-12-01', 'Glas Tholl', 2],
          ['2025-12-06', 'Garve Edge', 9],
          ['2025-12-13', 'Lochan Wood', 7]
        ], [3, 20])
      },
      {
        name: 'The two longest of four',
        steps: longestSteps('winter.csv', [
          ['2026-02-02', 'Lochan Wood', 3],
          ['2026-02-21', 'Glas Tholl', 12],
          ['2026-01-15', 'Meikle Pap', 12],
          ['2026-03-01', 'Creag Bheag', 10]
        ], [2, 4])
      }
    ]))
  }
}

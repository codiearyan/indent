import { judgeClass, memberSig, num, sigProblem } from '../../grading.mjs'

const HEADER = 'src/bench.h'
const SOURCE = 'src/bench.cpp'
const base = {
  files: [HEADER, SOURCE],
  inClass: [HEADER],
  className: 'Bench',
  classNames: ['Repair', 'Bench'],
  members: ['repairs'],
  owned: ['repairs'],
  functions: ['add', 'all', 'find', 'totalMinutes', 'remove'],
  writtenIn: SOURCE
}
const repairsOfCheck = [
  { name: 'Bench::repairs', task: 1, file: HEADER, lines: ['private: std::vector<Repair> repairs;', 'public: bool add(const Repair& repair); std::vector<Repair> all() const;'] },
  {
    name: 'Bench::add',
    task: 1,
    file: SOURCE,
    lines: [
      'bool Bench::add(const Repair& repair) { for (const Repair& held : repairs) if (held.getTicket() == repair.getTicket()) return false; repairs.push_back(repair); return true; }',
      'std::vector<Repair> Bench::all() const { return repairs; }'
    ]
  }
]
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const said = (got, key) => (got[key] === '1' ? 'true' : got[key] === '0' ? 'false' : 'nothing')

/** Check's repairs, made with minutes of its own: [ticket, item, minutes]. */
const make = (name, [ticket, item, minutes]) => `Repair ${name}(${ticket}, "${item}"); ${minutes ? `${name}.addMinutes(${minutes});` : ''}`
const filled = (bench, repairs) => `Bench ${bench}; ${repairs.map((r, i) => `${make(`${bench}_r${i}`, r)} ${bench}.add(${bench}_r${i});`).join(' ')}`
/** Writes what `bench`.all() holds as "ticket item minutes; ..." under `key`, read through a const Bench&. */
const listOf = (bench, key) =>
  `{ const Bench& indent_view_ = ${bench}; const std::vector<Repair> indent_v_ = indent_view_.all(); std::string indent_s_; for (const Repair& r : indent_v_) indent_s_ += std::to_string(r.getTicket()) + " " + r.getItem() + " " + std::to_string(r.getMinutes()) + "; "; ${put(key, 'indent_s_')} }`
const listText = (repairs) => repairs.map(([t, i, m]) => `${t} ${i} ${m}; `).join('')
const shownList = (text) => (text === undefined ? 'nothing Check could read' : text === '' ? 'no repairs' : text.trim().replace(/;$/, ''))

const R = {
  a: [4417, 'carriage clock', 95],
  b: [52, 'pocket watch', 0],
  c: [7, 'cuckoo clock', 30],
  d: [618, 'wall clock', 140]
}

export const checks = {
  repairs(t) {
    return judgeClass(t, {
      ...base,
      task: 1,
      probes: [
        {
          name: 'The bench\'s repairs cannot be reached from outside the class',
          params: 'Bench& b',
          code: '(void)b.repairs;',
          expect: /is a private member of|is private within this context/,
          compiled: "Check's own code, outside the class, could reach the bench's vector directly, so any line could put two repairs with one ticket on it, or empty it. repairs goes under private:, so that only the bench's own functions change it.",
          other: (text) => (/no member named|has no member named/.test(text) ? 'Check cannot find a member called repairs in Bench. Task 1 names it: write it with exactly that name, under private:.' : null),
          shown: "Check's line, outside the class: b.repairs"
        }
      ],
      cases: [
        {
          name: 'add and all take and give back what the task says',
          code: `${memberSig('Bench', 'add')} ${memberSig('Bench', 'all')}`,
          judge: (got) =>
            sigProblem(got, 'add', { returns: 'bool', params: [{ type: 'const Repair&', what: 'the repair' }], kind: 'mutable' }) ??
            (got.sig_all?.startsWith('const std::vector<Repair>&') ? sigProblem(got, 'all', { params: [], kind: 'const' }) : sigProblem(got, 'all', { returns: 'std::vector<Repair>', params: [], kind: 'const' }))
        },
        {
          name: 'add puts three repairs on a bench, and all gives them back in that order',
          code: `Bench b; ${make('x', R.a)} ${make('y', R.b)} ${make('z', R.c)} ${put('ok0', 'b.add(x)')} ${put('ok1', 'b.add(y)')} ${put('ok2', 'b.add(z)')} ${listOf('b', 'list')}`,
          judge: (got) => {
            const want = listText([R.a, R.b, R.c])
            if (got.list === want) return ['ok0', 'ok1', 'ok2'].every((k) => got[k] === '1') ? null : 'The repairs are on the bench, and add gave back false for one of them. It gives back true when it put the repair on.'
            if (got.list === '') return 'all gives back no repairs after three were added. add puts each repair on the bench\'s own vector, and all gives back what that vector holds.'
            return `After adding three repairs, all gives back ${shownList(got.list)}. It gives back every repair added, in the order they were added.`
          },
          output: (got) => `add gave back ${said(got, 'ok0')}, ${said(got, 'ok1')}, ${said(got, 'ok2')}; all() then holds ${shownList(got.list)}`
        },
        {
          name: 'add refuses a second repair with a ticket that is already on the bench',
          code: `Bench b; ${make('x', R.a)} Repair twin(${R.a[0]}, "lantern clock"); ${put('ok0', 'b.add(x)')} ${put('ok1', 'b.add(twin)')} ${listOf('b', 'list')}`,
          judge: (got) =>
            got.ok1 === '0' && got.list === listText([R.a])
              ? null
              : got.list === listText([R.a, [R.a[0], 'lantern clock', 0]])
                ? `add put a second repair with the ticket ${R.a[0]} on the bench. A ticket names one repair: add looks for it on the bench first, and when it is there, changes nothing and gives back false.`
                : `After adding ${R.a[0]} twice, add gave back ${said(got, 'ok1')} the second time and the bench holds ${shownList(got.list)}.`,
          output: (got) => `The second add gave back ${said(got, 'ok1')}; all() holds ${shownList(got.list)}`
        },
        {
          name: 'Two benches each keep their own repairs, and a copy of a bench is a bench of its own',
          code: `Bench one; Bench two; ${make('x', R.a)} ${make('y', R.b)} one.add(x); two.add(y); Bench copy = one; copy.add(y); ${listOf('one', 'one')} ${listOf('two', 'two')} ${listOf('copy', 'copy')}`,
          judge: (got) => {
            if (got.one === listText([R.a]) && got.two === listText([R.b]) && got.copy === listText([R.a, R.b])) return null
            if (got.one === got.two) return 'Check put one repair on one bench and another on a second bench, and both hold the same: every bench shares one vector. A static member is one value for the whole class; each bench keeps repairs of its own, so repairs is not static.'
            return `Check put ${R.a[0]} on one bench, ${R.b[0]} on another, copied the first and added ${R.b[0]} to the copy. The first holds ${shownList(got.one)}, the copy ${shownList(got.copy)}. A copy of a bench has its own vector: a change to the copy leaves the first as it was.`
          },
          output: (got) => `First bench: ${shownList(got.one)}\nSecond bench: ${shownList(got.two)}\nCopy of the first, with one more: ${shownList(got.copy)}`
        },
        {
          name: 'Changing what all gives back leaves the bench as it was',
          code: `${filled('b', [R.a, R.b])} { std::vector<Repair> v = b.all(); v.clear(); } ${listOf('b', 'list')}`,
          judge: (got) => (got.list === listText([R.a, R.b]) ? null : `Check emptied the vector all gave back, and afterwards the bench holds ${shownList(got.list)}. all gives back a copy, so the bench keeps its repairs.`),
          output: (got) => `After Check emptied what all() gave back, the bench holds ${shownList(got.list)}`
        }
      ]
    })
  },

  find(t) {
    const bench = [R.a, R.b, R.c]
    return judgeClass(t, {
      ...base,
      task: 2,
      provides: repairsOfCheck,
      cases: [
        {
          name: 'find takes an int, gives back a Repair and is const',
          code: memberSig('Bench', 'find'),
          judge: (got) => sigProblem(got, 'find', { returns: 'Repair', params: [{ type: 'int', what: 'the ticket' }], kind: 'const' })
        },
        ...[R.a, R.c].map(([ticket, item, minutes]) => ({
          name: `find(${ticket}) gives back the repair with ticket ${ticket}`,
          code: `${filled('b', bench)} const Bench& view = b; Repair f = view.find(${ticket}); ${put('t', 'f.getTicket()')} ${put('i', 'f.getItem()')} ${put('m', 'f.getMinutes()')}`,
          judge: (got) =>
            num(got, 't') === ticket && got.i === item && num(got, 'm') === minutes
              ? null
              : num(got, 't') === 0
                ? `find(${ticket}) gave back an empty repair, and ${ticket} is on the bench${ticket === bench.at(-1)[0] ? ', last' : ''}. find looks at every repair before it decides that none has the ticket: the empty repair is given back only after the loop.`
                : `find(${ticket}) gave back the repair with ticket ${got.t}, "${got.i ?? ''}".`,
          output: (got) => `find(${ticket}) gave back ticket ${got.t ?? '?'}, "${got.i ?? ''}", ${got.m ?? '?'} minutes`
        })),
        {
          name: 'find gives back a repair made with no values for a ticket that is not on the bench',
          code: `${filled('b', bench)} Repair f = b.find(9999); ${put('t', 'f.getTicket()')} ${put('i', 'f.getItem()')}`,
          judge: (got) => (num(got, 't') === 0 && got.i === 'none' ? null : `find(9999) gave back ticket ${got.t}, "${got.i ?? ''}", and no repair on the bench has that ticket. Then find gives back a Repair made with no values.`),
          output: (got) => `find(9999) gave back ticket ${got.t ?? '?'}, "${got.i ?? ''}"`
        },
        {
          name: 'A change to what find gives back leaves the bench as it was',
          code: `${filled('b', bench)} Repair f = b.find(${R.b[0]}); f.addMinutes(30); ${put('m', `b.find(${R.b[0]}).getMinutes()`)}`,
          judge: (got) => (num(got, 'm') === R.b[2] ? null : `Check added 30 minutes to the repair find gave back, and the bench's repair changed too: it has ${got.m} minutes. find gives back a copy.`),
          output: (got) => `After Check added 30 minutes to its copy, the bench's repair has ${got.m ?? '?'} minutes`
        }
      ]
    })
  },

  total(t) {
    return judgeClass(t, {
      ...base,
      task: 3,
      provides: repairsOfCheck,
      cases: [
        {
          name: 'totalMinutes takes nothing, gives back an int and is const',
          code: memberSig('Bench', 'totalMinutes'),
          judge: (got) => sigProblem(got, 'totalMinutes', { returns: 'int', params: [], kind: 'const' })
        },
        {
          name: 'An empty bench has 0 minutes in all',
          code: `Bench b; const Bench& view = b; ${put('n', 'view.totalMinutes()')}`,
          judge: (got) => (num(got, 'n') === 0 ? null : `An empty bench gives back ${got.n} from totalMinutes. With no repairs, the total is 0.`),
          output: (got) => `totalMinutes() on an empty bench: ${got.n ?? '?'}`
        },
        {
          name: 'The total follows the repairs on the bench as they are added',
          code: `Bench b; const Bench& view = b; ${make('x', R.a)} ${make('y', R.c)} ${make('z', R.d)} b.add(x); ${put('n1', 'view.totalMinutes()')} b.add(y); b.add(z); ${put('n3', 'view.totalMinutes()')}`,
          judge: (got) => {
            const one = R.a[2]
            const three = R.a[2] + R.c[2] + R.d[2]
            if (num(got, 'n1') === one && num(got, 'n3') === three) return null
            if (num(got, 'n3') === 0 || num(got, 'n3') === num(got, 'n1')) {
              return `totalMinutes gives back ${got.n1}, then ${got.n3} after two more repairs were added. Check builds this task with an add of its own, as Task 1 asks, which knows nothing of a total kept on the side: totalMinutes works the total out from the repairs on the bench each time, so it is never stale.`
            }
            return num(got, 'n3') === R.d[2] ? 'totalMinutes gives back the minutes of the last repair only. Each repair\'s minutes are added to the total, not put in its place.' : `With repairs of ${R.a[2]}, ${R.c[2]} and ${R.d[2]} minutes on the bench, totalMinutes gives back ${got.n3}.`
          },
          output: (got) => `One repair: ${got.n1 ?? '?'} minutes in all; three repairs: ${got.n3 ?? '?'}`
        }
      ]
    })
  },

  remove(t) {
    const four = [R.a, R.b, R.c, R.d]
    const removeCase = (name, list, ticket, want) => ({
      name,
      code: `${filled('b', list)} ${put('ok', `b.remove(${ticket})`)} ${listOf('b', 'list')}`,
      judge: (got) => {
        const left = listText(list.filter(([t]) => t !== ticket))
        const there = list.some(([t]) => t === ticket)
        if (got.list === left && got.ok === (want ? '1' : '0')) return null
        if (!there && got.list !== listText(list)) return `remove(${ticket}) changed the bench, and no repair on it has that ticket. Then remove changes nothing and gives back false.`
        if (!there) return `remove(${ticket}) gave back true, and no repair on the bench has that ticket. Then it gives back false.`
        if (got.list === listText(list)) return `remove(${ticket}) left every repair on the bench${got.ok === '1' ? ', and gave back true' : ''}. It takes the repair with that ticket off the bench's own vector.`
        if (got.list === left) return `remove(${ticket}) took the right repair off and gave back false. It gives back true when it took one off.`
        return `remove(${ticket}) left ${shownList(got.list)} on the bench. It takes off only the repair with that ticket, and the others keep their order.`
      },
      output: (got) => `On the bench: ${shownList(listText(list))}\nremove(${ticket}) gave back ${said(got, 'ok')}; left: ${shownList(got.list)}`
    })
    return judgeClass(t, {
      ...base,
      task: 4,
      provides: repairsOfCheck,
      cases: [
        {
          name: 'remove takes an int and gives back a bool',
          code: memberSig('Bench', 'remove'),
          judge: (got) => sigProblem(got, 'remove', { returns: 'bool', params: [{ type: 'int', what: 'the ticket' }], kind: 'mutable' })
        },
        removeCase(`remove(${R.b[0]}) takes the second of four repairs off`, four, R.b[0], true),
        removeCase(`remove(${R.d[0]}) takes the last repair off`, four, R.d[0], true),
        removeCase(`remove(${R.a[0]}) takes the first repair off`, four, R.a[0], true),
        removeCase('remove(9999) leaves the bench as it was', four, 9999, false),
        removeCase('remove on an empty bench gives back false', [], R.a[0], false)
      ]
    })
  }
}

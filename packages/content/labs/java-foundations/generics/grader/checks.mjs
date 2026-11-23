import { attempt, codeOnly, explainCollection, fail, outcomeCases, pass, refusal, tasks } from '../../grading.mjs'

const FILE = 'HutTools.java'
const value = (r, name) => r.values[name]?.value ?? null
const items = (r, name) => r.values[name]?.items ?? null
const same = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x === String(b[i]))
const fromMine = (x) => !!x && x.frames.some((f) => f.includes(`(${FILE}:`))

// A raw Pair or a cast to A, B or Pair compiles with a warning and behaves, so Check reads Task 1's
// own lines for them: either moves the type check from the compiler to the running program.
const NO_CAST = 'Pair keeps its types, with no raw Pair and no cast'
function typesKept(section) {
  const code = codeOnly(section)
  if (/\bnew\s+Pair\s*\(|\bPair\s+\w+\s*[(=;,)]/.test(code))
    return fail(NO_CAST, 'Task 1 names or makes a Pair with no types in angle brackets, a raw type. Java forgets the types there and lets a mix-up through with only a warning. Write the types in angle brackets wherever Pair is named or made; new Pair<> works them out for you.')
  if (/\(\s*(?:A|B|Pair\s*(?:<[^>()]*>)?)\s*\)\s*[\w(]/.test(code))
    return fail(NO_CAST, 'Task 1 casts to A, B or a Pair. A cast makes the compiler take your word, and moves the check to a ClassCastException on some later day. Keep the fields as A and B, and the methods give back what they hold with no cast.')
  return pass(NO_CAST)
}

/** A case of Task 1: Check's own lines, which compile only when Pair holds the types it is given. */
const pair = (name, code, reads, expected, hint, extra) => ({ name, code, reads, after: reads, expected, hint, ...extra })

// Check's own types for Tasks 2 and 3, which no answer can know about in advance.
const OWN = `record Watch(String skipper, int hour) {
}
record Tide(int cm) implements Comparable<Tide> {
    public int compareTo(Tide other) { return Integer.compare(cm, other.cm); }
}`

const rota = (name, type, make, expected, extra) =>
  attempt({
    name,
    setup: [`List<${type}> rota = ${make};`],
    call: 'Rotas.nextWeek(rota)',
    type: `List<${type}>`,
    after: { rota: 'rota' },
    expected: { got: expected },
    ...extra
  })

// What comes back is kept as an int for a list of Integer, so it reads as a number.
const most = (name, type, list, expected, extra) =>
  attempt({
    name,
    setup: [`List<${type}> items = ${list};`],
    call: 'Most.largest(items)',
    type: type === 'Integer' ? 'int' : type,
    expected: { got: expected },
    ...extra
  })

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  collections: true,
  tasks: {
    pair: {
      task: 1,
      cases: [
        pair('Holds a text and a number, and gives each back as its own type', ['Pair<String, Integer> p = new Pair<>("Curlew", 7);', 'String boat = p.first();', 'int hour = p.second();'], { boat: 'boat', hour: 'hour' }, { boat: 'Curlew', hour: 7 }, 'first should give back what the pair was made with first, and second what it was made with second.'),
        pair('Holds a number and a text', ['Pair<Integer, String> q = new Pair<>(14, "Murdo");', 'int number = q.first();', 'String name = q.second();'], { number: 'number', name: 'name' }, { number: 14, name: 'Murdo' }, 'first and second should give back what the pair holds, whatever its types.'),
        pair('Each pair keeps its own', ['Pair<String, Integer> a = new Pair<>("Plover", 15);', 'Pair<String, Integer> b = new Pair<>("Skua", 8);'], { 'a.first()': 'a.first()', 'a.second()': '(int) a.second()', 'b.first()': 'b.first()' }, { 'a.first()': 'Plover', 'a.second()': 15, 'b.first()': 'Skua' }, 'Each pair should give back what it was made with.', { own: true }),
        pair('swapped gives back a new pair the other way round', ['Pair<String, Integer> p = new Pair<>("Linnet", 11);', 'Pair<Integer, String> s = p.swapped();'], { 's.first()': 's == null ? -1 : (int) s.first()', 's.second()': 's == null ? null : s.second()', 'p.first()': 'p.first()', 'p.second()': '(int) p.second()' }, { 's.first()': 11, 's.second()': 'Linnet', 'p.first()': 'Linnet', 'p.second()': 11 }, 'swapped should give back a new pair holding the second first and the first second, and leave this pair as it is.', { swap: true }),
        {
          name: 'first gives back the first type, not just any object',
          refuse: true,
          code: ['Integer wrong = new Pair<>("Fulmar", 3).first();'],
          error: /String cannot be converted to (?:java\.lang\.)?Integer/,
          allowed: 'Check kept what first() gives back for a Pair made with a String first in an Integer, and Java let it. first should give back exactly the type A, here String, so the compiler can refuse a mix-up like this.',
          other: 'Check kept what first() gives back for a Pair made with a String first in an Integer, to see that Java refuses it, and Java refused it for another reason: the message below says why. first should give back the type A.'
        }
      ],
      judge: (runs, ctx) => [
        ...outcomeCases({
          file: FILE,
          explain: explainCollection,
          mistakes: [
            {
              when: (r) => r.case.own && value(r, 'a.first()') === 'Skua',
              hint: 'Check made two pairs, and the first now holds the second one\'s values. A field with static in front belongs to the class, so every pair shares it. Each pair needs its own.'
            },
            {
              when: (r) => r.case.swap && value(r, 'p.first()') !== 'Linnet',
              hint: 'swapped changed the pair it was called on. The task asks for a new pair, the other way round, and leaves this one as it is.'
            }
          ]
        })(runs, ctx),
        ...runs.filter((r) => r.case.refuse).map((r) => refusal(r, r.case)),
        typesKept(ctx.section)
      ]
    },

    rota: {
      task: 2,
      stub: OWN,
      cases: [
        rota('Moves the first skipper to the end', 'String', 'List.of("Coinneach", "Raonaid", "Eachann")', ['Raonaid', 'Eachann', 'Coinneach'], { hint: 'nextWeek should give back a new list: the rota with its first item moved to the end.' }),
        rota('Works for a rota of numbers', 'Integer', 'List.of(4, 9, 2, 7)', [9, 2, 7, 4], { hint: 'nextWeek should do the same for a list of anything: the first item moved to the end.' }),
        rota('Works for a type it has never seen', 'Watch', 'List.of(new Watch("Coinneach", 6), new Watch("Marsaili", 14))', ['Watch[skipper=Marsaili, hour=14]', 'Watch[skipper=Coinneach, hour=6]'], { hint: 'nextWeek should work for a list of any type at all, one of Check\'s own included.' }),
        rota('Leaves the caller\'s rota as it is', 'String', 'new ArrayList<>(List.of("Alasdair", "Floraidh"))', null, { mine: true, hint: 'nextWeek should give back a new list, and leave the rota it is handed as it was.', expected: { got: ['Floraidh', 'Alasdair'], rota: ['Alasdair', 'Floraidh'] } }),
        rota('A rota of one', 'String', 'List.of("Beathag")', ['Beathag'], { hint: 'A rota of one stays the same next week.' }),
        rota('An empty rota', 'Integer', 'List.of()', [], { hint: 'An empty rota should give back an empty list.' }),
        {
          name: 'Gives back a list of the type it was handed',
          refuse: true,
          code: ['List<Integer> wrong = Rotas.nextWeek(List.of("Somhairle"));'],
          error: /incompatible types|inference variable/,
          allowed: 'Check kept the list nextWeek gives back for a list of String in a list of Integer, and Java let it: nextWeek gives back a plain List, with no type in angle brackets, so Java cannot check what it holds. It should give back a List<T>, of the same T it was handed.',
          other: 'Check kept the list nextWeek gives back for a list of String in a list of Integer, to see that Java refuses it, and Java refused it for another reason: the message below says why.'
        }
      ],
      judge: (runs, ctx) => [
        ...outcomeCases({
          file: FILE,
          explain: explainCollection,
          mistakes: [
            {
              when: (r, x) => x?.name === 'UnsupportedOperationException' && fromMine(x),
              hint: 'nextWeek changed the rota it was handed, a list made with List.of, which can never change. The task asks for a new list: make one from the rota, and change that.'
            },
            {
              when: (r, x) => !x && r.case.mine && !same(items(r, 'rota'), r.case.expected.rota),
              hint: 'nextWeek changed the caller\'s rota. The task asks for a new list, and the rota stays as it is.'
            },
            {
              when: (r, x) => x?.name === 'IndexOutOfBoundsException' && items(r, 'got') === null && r.case.name === 'An empty rota',
              hint: 'nextWeek asked an empty rota for its first item, which it does not have. An empty rota gives back an empty list.'
            }
          ]
        })(runs, ctx),
        ...runs.filter((r) => r.case.refuse).map((r) => refusal(r, r.case))
      ]
    },

    largest: {
      task: 3,
      stub: OWN,
      cases: [
        most('Finds the largest number', 'Integer', 'List.of(14, 9, 210, 31)', 210, { least: 9, hint: 'largest should give back the largest item of the list, by its natural order.' }),
        most('Finds the last name in alphabetical order', 'String', 'List.of("Plover", "Gannet", "Skua", "Curlew")', 'Skua', { least: 'Curlew', hint: 'For text, the natural order is alphabetical order, so the largest is the one that comes last.' }),
        most('Works for a type it has never seen', 'Tide', 'List.of(new Tide(120), new Tide(340), new Tide(90))', null, { hint: 'largest should work for any type with a natural order, one of Check\'s own included: Check\'s Tide is ordered by its cm.', after: { 'got.cm()': 'got == null ? -1 : got.cm()' }, expected: { 'got.cm()': 340 } }),
        most('The largest first', 'Integer', 'List.of(500, 3, 2)', 500, { least: 2, hint: 'largest should find the largest wherever it is in the list, the first place included.' }),
        most('The largest last', 'Integer', 'new ArrayList<>(List.of(1, 2, 300))', 300, { hint: 'largest should find the largest wherever it is in the list, the last place included.', after: { items: 'items' }, expected: { got: 300, items: [1, 2, 300] }, mine: true }),
        most('One item', 'String', 'List.of("Raonaid")', 'Raonaid', { hint: 'For a list of one, largest should give back that one item.' }),
        most('No items', 'String', 'List.of()', null, { hint: 'For an empty list, largest should give back null.', empty: true }),
        {
          name: 'Refuses things that have no order',
          refuse: true,
          code: ['Object wrong = Most.largest(List.of(new Object(), new Object()));'],
          error: /inference variable|incompatible bounds|cannot be applied|no suitable method/,
          allowed: 'Check handed largest a list of plain Objects, which have no natural order, and Java let it through, so the mistake would only show as a ClassCastException when the program runs. A bound after the type parameter says T must have a natural order, and then the compiler refuses a list like this one.',
          other: 'Check handed largest a list of plain Objects, to see that Java refuses it, and Java refused it for another reason: the message below says why.'
        }
      ],
      judge: (runs, ctx) => [
        ...outcomeCases({
          file: FILE,
          explain: explainCollection,
          mistakes: [
            {
              when: (r, x) => x?.name === 'UnsupportedOperationException' && fromMine(x),
              hint: 'largest changed the list it was handed, a list made with List.of, which can never change: sorting it, for one, changes it. The task says items stays as it is.'
            },
            {
              when: (r, x) => !x && r.case.mine && !same(items(r, 'items'), r.case.expected.items),
              hint: 'largest changed the caller\'s list. The task says items stays as it is.'
            },
            {
              when: (r, x) => r.case.empty && (x?.name === 'IndexOutOfBoundsException' || x?.name === 'NoSuchElementException'),
              hint: 'largest asked an empty list for an item it does not have. For an empty list, largest gives back null.'
            },
            {
              when: (r, x) => !x && r.case.least !== undefined && value(r, 'got') === String(r.case.least),
              hint: 'largest gives back the smallest item, not the largest. compareTo gives back a number above 0 when the item it is called on comes after the one it is handed.'
            },
            {
              when: (r, x) => !x && /compareTo\s*\([^)]*\)\s*==\s*-?1\b/.test(codeOnly(ctx.section)),
              hint: 'largest asks whether compareTo gave back exactly 1. compareTo promises only a number below 0, 0, or above 0, and for text it is often more than 1: ask whether it is above or below 0.'
            }
          ]
        })(runs, ctx),
        ...runs.filter((r) => r.case.refuse).map((r) => refusal(r, r.case))
      ]
    }
  }
})

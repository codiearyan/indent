import { judgeType, judgeTypes, recordShown } from '../../grading.mjs'

const FILE = 'src/slip.cpp'
const REPAIR = [
  ['ticket', 'int'],
  ['owner', 'std::string'],
  ['item', 'std::string'],
  ['minutes', 'int']
]
const types = { Repair: REPAIR }
const repairOfCheck = {
  name: 'Repair',
  task: 1,
  lines: ['struct Repair { int ticket = 0; std::string owner; std::string item; int minutes = 0; };']
}
const text = { what: 'text', type: 'std::string', const: true, want: 'const std::string&' }
const repairParam = { name: 'repair', what: 'the repair', type: 'Repair', const: true, after: true, want: 'const Repair&' }
const article = (type) => (/^[aeiou]/.test(type) ? 'an' : 'a')

const typesOf = REPAIR.map(([m]) => `std::cerr << "\\036type_${m}\\037"; indent_::type_<decltype(Repair::${m})>(); std::cerr << "\\036";`).join(' ')
const parse = (got, key) => {
  try {
    return JSON.parse(got[key])
  } catch {
    return undefined
  }
}

export const checks = {
  struct(t) {
    return judgeType(t, {
      files: [FILE],
      task: 1,
      types,
      cases: [
        {
          name: 'Repair has ticket, owner, item and minutes, each of the type the task gives it',
          code: typesOf,
          judge: (got) => {
            const wrong = REPAIR.find(([m, type]) => got[`type_${m}`] !== type)
            if (!wrong) return null
            const [m, type] = wrong
            const is = got[`type_${m}`]
            return `${m} is ${is === 'something else' ? 'of another type' : `${article(is)} ${is}`}, and the task asks for ${article(type)} ${type}. Look at the type written in front of ${m} in the struct.`
          },
          output: (got) => REPAIR.map(([m]) => `${m}: ${got[`type_${m}`]}`).join('\n')
        },
        {
          name: 'Repair writes ticket, owner, item and minutes in that order',
          // Members of one struct sit in memory in the order they are written.
          code: `Repair indent_o_; const char* indent_p_[] = {${REPAIR.map(([m]) => `reinterpret_cast<const char*>(&indent_o_.${m})`).join(', ')}}; indent_::put_("ordered", indent_p_[0] < indent_p_[1] && indent_p_[1] < indent_p_[2] && indent_p_[2] < indent_p_[3] ? 1 : 0);`,
          judge: (got) =>
            got.ordered === '1'
              ? null
              : 'The members of Repair are written in another order than the task gives. Write them in its order: ticket, owner, item, then minutes. Filled with braces, a struct takes its values in the order its members are written, and from Task 2 on Check uses a Repair in the task\'s order.',
          output: () => `The task's order: ${REPAIR.map(([m]) => m).join(', ')}`
        },
        {
          name: 'A new Repair starts with its ticket and its minutes at 0, and empty texts',
          code: 'alignas(Repair) unsigned char indent_b_[sizeof(Repair)]; std::memset(indent_b_, 0x5A, sizeof indent_b_); Repair* indent_r_ = new (indent_b_) Repair; indent_::put_("value", *indent_r_); indent_r_->~Repair();',
          judge: (got) => {
            const v = parse(got, 'value')
            if (!v) return 'Check could not read a new Repair.'
            const off = ['ticket', 'minutes'].find((m) => v[m] !== 0)
            if (off) {
              return v[off] === 1515870810 || Math.abs(v[off]) > 100000
                ? `The member ${off} of a new Repair holds ${v[off]}: whatever was left in that memory. A member with no starting value written in the struct holds whatever was there, and the task asks for ${off} to start at 0.`
                : `The ${off} of a new Repair starts at ${v[off]}, and the task asks for it to start at 0.`
            }
            const full = ['owner', 'item'].find((m) => v[m] !== '')
            if (full) return `The ${full} of a new Repair starts as "${v[full]}". The task gives it no starting text, so a new one is empty.`
            return null
          },
          output: (got) => `A new Repair, before anything is put in it: ${recordShown(parse(got, 'value'))}`
        },
        {
          name: 'Two repairs each keep the values Check puts in their members',
          code: 'Repair a; a.ticket = 4417; a.owner = "Corwin Dace"; a.item = "carriage clock"; a.minutes = 95; Repair b; b.ticket = 5020; b.owner = "Sabine Prowse"; b.item = "pocket watch"; b.minutes = 30; indent_::put_("a", a); indent_::put_("b", b);',
          judge: (got) => {
            const a = parse(got, 'a')
            const b = parse(got, 'b')
            const wantA = { ticket: 4417, owner: 'Corwin Dace', item: 'carriage clock', minutes: 95 }
            const wantB = { ticket: 5020, owner: 'Sabine Prowse', item: 'pocket watch', minutes: 30 }
            const off = [
              [a, wantA],
              [b, wantB]
            ].flatMap(([g, w]) => REPAIR.map(([m]) => [m, g?.[m], w[m]])).find(([, g, w]) => g !== w)
            if (!off) return null
            return `Check put ${JSON.stringify(off[2])} in ${off[0]} and read back ${JSON.stringify(off[1])}. Look at the type of ${off[0]}: it has to hold that value whole.`
          },
          output: (got) => `Check's two repairs: ${recordShown(parse(got, 'a'))} and ${recordShown(parse(got, 'b'))}`
        }
      ]
    })
  },

  takein(t) {
    const cases = [
      [4417, 'Corwin Dace', 'carriage clock'],
      [5020, 'Sabine Prowse', 'pocket watch'],
      [12, 'Anselm Vickery', 'cuckoo clock']
    ]
    return judgeTypes(t, {
      files: [FILE],
      task: 2,
      fn: 'takeIn',
      types,
      provides: [repairOfCheck],
      returns: 'Repair',
      params: [
        { name: 'ticket', what: 'the ticket', type: 'int', want: 'int' },
        { ...text, name: 'owner', what: 'the owner' },
        { ...text, name: 'item', what: 'the item' }
      ],
      typed: 'Check called takeIn with other tickets, owners and items and got the same repair back each time. Fill the new repair in from what takeIn is given.',
      cases: cases.map(([ticket, owner, item]) => {
        const want = { ticket, owner, item, minutes: 0 }
        return {
          name: `takeIn(${ticket}, "${owner}", "${item}")`,
          args: [ticket, owner, item],
          expect: { result: want, printed: '' },
          hint: (r) => {
            const got = r.result ?? {}
            if (got.owner === item && got.item === owner) return 'The owner and the item are swapped: the owner went into item, and the item into owner.'
            const empty = REPAIR.find(([m]) => m !== 'minutes' && got[m] !== want[m] && (got[m] === 0 || got[m] === ''))
            if (empty) return `The repair takeIn gives back has nothing in ${empty[0]}. Each of the three values it is given goes into its own member.`
            if (got.minutes !== 0) return `The minutes of the repair takeIn gives back are ${got.minutes}. A new repair has had no time at the bench yet, so its minutes are 0.`
            const off = REPAIR.find(([m]) => got[m] !== want[m])
            return off
              ? `The repair takeIn gives back has ${off[0]} ${JSON.stringify(got[off[0]])}, and Check gave it ${JSON.stringify(want[off[0]])}. Each member of the new repair comes from what takeIn is given.`
              : 'The repair takeIn gives back does not hold the ticket, the owner and the item it was given.'
          }
        }
      })
    })
  },

  slip(t) {
    const cases = [
      { ticket: 4417, owner: 'Corwin Dace', item: 'carriage clock', minutes: 95 },
      { ticket: 5020, owner: 'Sabine Prowse', item: 'pocket watch', minutes: 0 },
      { ticket: 7, owner: 'Anselm Vickery', item: 'cuckoo clock', minutes: 130 }
    ]
    return judgeTypes(t, {
      files: [FILE],
      task: 3,
      fn: 'slipLine',
      types,
      provides: [repairOfCheck],
      returns: 'std::string',
      params: [repairParam],
      typed: 'Check called slipLine with other repairs and got the same line back each time. Build the line from the members of the repair it is given.',
      cases: cases.map((repair) => {
        const want = `${repair.ticket} ${repair.item} for ${repair.owner}, ${repair.minutes} min`
        return {
          name: `The slip of ticket ${repair.ticket}`,
          args: [repair],
          expect: { result: want, printed: '', args: [repair] },
          hint: (r) => {
            const got = typeof r.result === 'string' ? r.result : ''
            const squash = (s) => s.replace(/\s/g, '').toLowerCase()
            if (squash(got) === squash(want)) return `slipLine gives back "${got}": the right words, but look at the spaces and capital letters against the task's line.`
            if (!got.includes(String(repair.ticket))) return 'The ticket is not in the line as a number. A number becomes text with std::to_string before it is joined to other text.'
            if (!got.includes(`${repair.minutes} min`)) return `The line does not end with the minutes and " min". The minutes are a number too, so they become text with std::to_string first.`
            if (got.indexOf(repair.owner) < got.indexOf(repair.item)) return 'The owner comes before the item. The line is the ticket, the item, " for " and then the owner.'
            return `slipLine gives back "${got}", which is not the task's line for this repair.`
          }
        }
      })
    })
  },

  pickup(t) {
    const cases = [
      { repair: { ticket: 4417, owner: 'Corwin Dace', item: 'carriage clock', minutes: 95 }, customer: { name: 'Mirabel Stroud', phone: '01632 960447' } },
      { repair: { ticket: 52, owner: 'Sabine Prowse', item: 'pocket watch', minutes: 0 }, customer: { name: 'Sabine Prowse', phone: '01632 960903' } },
      { repair: { ticket: 6180, owner: 'Lazlo Rendle', item: 'wall clock', minutes: 40 }, customer: { name: 'Ondine Marrick', phone: '01632 960265' } }
    ]
    return judgeTypes(t, {
      files: [FILE],
      task: 4,
      fn: 'callLine',
      types: {
        Repair: REPAIR,
        Customer: [
          ['name', 'std::string'],
          ['phone', 'std::string']
        ],
        Pickup: [
          ['repair', 'Repair'],
          ['customer', 'Customer']
        ]
      },
      provides: [repairOfCheck],
      returns: 'std::string',
      params: [{ name: 'pickup', what: 'the pickup', type: 'Pickup', const: true, after: true, want: 'const Pickup&' }],
      typed: 'Check called callLine with other pickups and got the same line back each time. Build the line from the pickup it is given.',
      cases: cases.map((pickup) => {
        const want = `Ring ${pickup.customer.name} on ${pickup.customer.phone} about ticket ${pickup.repair.ticket}`
        return {
          name: `Ringing ${pickup.customer.name} about ticket ${pickup.repair.ticket}`,
          args: [pickup],
          expect: { result: want, printed: '', args: [pickup] },
          hint: (r) => {
            const got = typeof r.result === 'string' ? r.result : ''
            if (pickup.repair.owner !== pickup.customer.name && got.includes(pickup.repair.owner)) {
              return "The line names the repair's owner. Here someone else collects it: the name to ring is the customer's, inside pickup.customer."
            }
            if (!got.includes(pickup.customer.phone)) return "The customer's phone is not in the line. It is a member of the customer, which is a member of the pickup."
            if (!got.endsWith(`ticket ${pickup.repair.ticket}`)) return "The line does not end with the repair's ticket as a number. The ticket is a member of the repair inside the pickup, and std::to_string makes it text."
            return `callLine gives back "${got}", which is not the task's line for this pickup. Look at the words and spaces between the parts.`
          }
        }
      })
    })
  }
}

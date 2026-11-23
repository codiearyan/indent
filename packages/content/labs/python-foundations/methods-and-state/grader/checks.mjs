import { classCases, tuple } from '../../grading.mjs'

const FILE = 'packs.py'
const ATTRS = ['owner', 'limit', 'items', 'weight']
const METHODS = ['add', 'weight', 'remove', 'without']
const OWNERS = { add: 1, weight: 2, remove: 3, without: 4 }

const has = (v, key) => v?.['@dict']?.some(([k]) => k === key)

/** A pack made with the __init__ the file came with, and its items filled in by Check. */
function packed(name, owner, limit, items = {}) {
  return [
    { code: `${name} = Pack(${JSON.stringify(owner)}, ${limit})` },
    {
      code: `(${name}.owner, ${name}.limit, ${name}.items)`,
      want: tuple(owner, limit, {}),
      hidden: true,
      hint: 'The __init__ that came with the file no longer makes a pack with its owner, its limit and an empty items dictionary. Put it back as it was: every task builds on it.'
    },
    ...Object.entries(items).map(([item, kg]) => ({ code: `${name}.items[${JSON.stringify(item)}] = ${kg}` }))
  ]
}

const items = (code, want, hint) => ({ code, want, hint })

export const checks = {
  add(t) {
    const over = (code, names) => ({
      code,
      raises: {
        type: 'ValueError',
        own: true,
        has: names.has,
        names: names.words,
        swallowed: (rec) =>
          rec.printed
            ? `${code} printed a line, and the item went into the pack anyway. print only shows a line; the code that called add carries on as if all were well. Refuse it with raise, before the item goes in.`
            : `${code} went through, and here the item ${names.why}. Refuse it with raise, before the item goes in.`
      }
    })
    const left = (code, want, item) =>
      items(code, want, (v) =>
        has(v, item)
          ? `The refused ${item} is in the pack after all. Refuse before the item goes in, so a refused item leaves the pack as it was.`
          : 'After a refused item, the pack does not hold what it held before.'
      )
    return classCases(t, {
      file: FILE,
      task: 1,
      attrs: ATTRS,
      methods: METHODS,
      owners: OWNERS,
      list: [
        {
          name: 'Two items into one pack, none into another',
          steps: [
            ...packed('pack', 'Morag', 11),
            ...packed('other', 'Ross', 11),
            { code: 'pack.add("rope", 4.5)', ownHint: 'Morag\'s pack can take these: look at the condition that decides when to raise.' },
            { code: 'pack.add("flask", 1.25)', ownHint: 'Morag\'s pack can take these: look at the condition that decides when to raise.' },
            items('pack.items', { rope: 4.5, flask: 1.25 }, (v) =>
              v?.['@dict']?.length === 1
                ? 'The pack holds only the last item added. Put each item into the dictionary the pack already has, under its name, instead of giving the pack a new dictionary.'
                : 'The pack\'s items are not each item added, its name as the key and its weight as the value.'
            ),
            items('other.items', {}, 'Items added to one pack turn up in another. Put them into this pack\'s own items, through self.')
          ]
        },
        {
          name: 'Right up to the limit is fine',
          steps: [
            ...packed('pack', 'Ross', 6),
            { code: 'pack.add("rope", 4.5)' },
            {
              code: 'pack.add("map", 1.5)',
              ownHint: 'That item brings the pack to exactly its limit, and a pack at its limit is fine: refuse only an item that takes it over.'
            },
            items('pack.items', { rope: 4.5, map: 1.5 }, 'The pack does not hold both items, though together they weigh exactly its limit.')
          ]
        },
        {
          name: 'Over the limit is refused',
          steps: [
            ...packed('pack', 'Morag', 11),
            { code: 'pack.add("rope", 4.5)' },
            { code: 'pack.add("tent", 5.25)' },
            over('pack.add("stove", 2.5)', {
              has: ['stove', '11'],
              words: 'the item and the limit',
              why: 'takes the pack over its limit, with what is in it already'
            }),
            left('pack.items', { rope: 4.5, tent: 5.25 }, 'stove')
          ]
        },
        {
          name: 'One item heavier than the whole limit',
          steps: [
            ...packed('pack', 'Ross', 3),
            over('pack.add("tent", 5.25)', {
              has: ['tent', '3'],
              words: 'the item and the limit',
              why: 'weighs more than the whole limit by itself'
            }),
            left('pack.items', {}, 'tent')
          ]
        },
        {
          name: 'A weight of 0 or less is refused',
          steps: [
            ...packed('pack', 'Ross', 11),
            over('pack.add("map", 0)', { has: ['0'], words: 'the weight it was given', why: 'weighs nothing' }),
            over('pack.add("flask", -1.25)', { has: ['-1.25'], words: 'the weight it was given', why: 'weighs less than nothing' }),
            left('pack.items', {}, 'flask')
          ]
        }
      ]
    })
  },

  weight(t) {
    const read = (code, want, count, stale = false) => ({
      code,
      want,
      hint: (v, seen, rec) =>
        v?.['@other'] === 'method'
          ? `${code} gives the method itself, not a number: without round brackets a plain method is not called. The task asks for a property, read with no round brackets, and @property on the line above the def does that.`
          : stale && typeof (v?.['@float'] ?? v) === 'number' && (v?.['@float'] ?? v) !== want
            ? `${code} did not change after Check put another item into items. Work the total out from items every time weight is read, so it is right however items changed.`
            : v === 0 && want !== 0
              ? `${code} is 0, though items holds ${count} items. Work the total out from items every time weight is read, so it is right however items changed.`
              : typeof v === 'number' && v === count && count !== want
              ? 'weight gives back how many items there are, not what they weigh.'
              : v === null
                ? `weight gives back None: it ends without return.${rec.printed ? ' print only shows the total; return gives it back to the code that reads pack.weight.' : ''}`
                : `${code} is not the total of the weights in items.`
    })
    return classCases(t, {
      file: FILE,
      task: 2,
      attrs: ATTRS,
      methods: METHODS,
      owners: OWNERS,
      list: [
        {
          name: 'The total, and again after one more item',
          steps: [
            ...packed('pack', 'Morag', 11, { rope: 4.5, flask: 1.25 }),
            read('pack.weight', 5.75, 2),
            { code: 'pack.items["stove"] = 2.5' },
            read('pack.weight', 8.25, 3, true)
          ]
        },
        { name: 'Another pack', steps: [...packed('pack', 'Ross', 6, { map: 0.5, helmet: 0.75 }), read('pack.weight', 1.25, 2)] },
        { name: 'An empty pack weighs 0', steps: [...packed('pack', 'Ross', 6), read('pack.weight', 0, 0)] }
      ]
    })
  },

  remove(t) {
    const taken = (code, want) => ({
      code,
      want,
      hint: (v) =>
        v === null
          ? `${code} gives back None. The task asks for the weight of the item taken out: keep it before it goes, and give it back with return.`
          : `${code} does not give back the weight of the item it took out.`
    })
    const left = (code, want, item) =>
      items(code, want, (v) =>
        has(v, item)
          ? `The ${item} is still in the pack. Take it out of this pack's own items, through self: taking it out of a copy leaves the pack as it was.`
          : 'After remove, the pack does not hold every other item it held.'
      )
    return classCases(t, {
      file: FILE,
      task: 3,
      attrs: ATTRS,
      methods: METHODS,
      owners: OWNERS,
      list: [
        {
          name: 'One item out of two',
          steps: [...packed('pack', 'Morag', 11, { rope: 4.5, flask: 1.25 }), taken('pack.remove("flask")', 1.25), left('pack.items', { rope: 4.5 }, 'flask')]
        },
        {
          name: 'The only item',
          steps: [...packed('pack', 'Ross', 6, { map: 0.5 }), taken('pack.remove("map")', 0.5), left('pack.items', {}, 'map')]
        },
        {
          name: 'An item that is not in the pack is refused',
          steps: [
            ...packed('pack', 'Morag', 11, { rope: 4.5 }),
            {
              code: 'pack.remove("helmet")',
              value: true,
              raises: {
                type: 'ValueError',
                own: true,
                has: ['helmet'],
                names: 'the item',
                wrongType:
                  'For an item that is not in the pack, the task asks for a ValueError raised by your own raise line, with a message that names the item. A KeyError says only that a dictionary has no such key.',
                swallowed: (rec) =>
                  `pack.remove("helmet") ${rec.printed ? 'printed a line and ' : ''}gave back ${rec.value?.repr ?? 'a value'} for an item that is not in the pack. The task asks remove to refuse it with raise.`
              }
            },
            items('pack.items', { rope: 4.5 }, 'After a refused remove, the pack does not hold what it held before.')
          ]
        }
      ]
    })
  },

  without(t) {
    const steps = (owner, limit, all, gone) => {
      const rest = Object.fromEntries(Object.entries(all).filter(([k]) => k !== gone))
      return [
        ...packed('pack', owner, limit, all),
        { code: `lighter = pack.without(${JSON.stringify(gone)})` },
        {
          code: 'type(lighter).__name__',
          want: 'Pack',
          hidden: '# Check asks what kind of value without gave back',
          hint: (v) =>
            v === 'NoneType'
              ? 'without gives back None. The task asks it to give back the new pack, with return.'
              : `without gives back ${v === 'dict' ? 'a dictionary' : `a ${v}`}, and the task asks for a new Pack.`
        },
        {
          code: 'lighter is pack',
          want: false,
          hint: 'without gives back this same pack, under a second name. The task asks for a new Pack, made with Pack(...), and this one left as it was.'
        },
        {
          code: '(lighter.owner, lighter.limit)',
          want: tuple(owner, limit),
          hint: 'The new pack does not have the owner and the limit of this one.'
        },
        items('lighter.items', rest, (v) =>
          has(v, gone)
            ? `The new pack still holds the ${gone}.`
            : v?.['@dict']?.length === 0
              ? 'The new pack holds no items at all. It holds every item of this pack but the one named.'
              : 'The new pack does not hold every item of this pack but the one named.'
        ),
        items('pack.items', all, (v) =>
          !has(v, gone)
            ? `This pack lost the ${gone} too. The new pack shares this pack's items dictionary, so taking an item out of one takes it out of both: give the new pack a dictionary of its own.`
            : 'This pack does not hold what it held before.'
        ),
        { code: 'lighter.items["whistle"] = 0.25' },
        items('pack.items', all, (v) =>
          has(v, 'whistle')
            ? 'A whistle put into the new pack shows up in this one too: both packs share one items dictionary. Give the new pack a dictionary of its own.'
            : 'This pack does not hold what it held before.'
        )
      ]
    }
    return classCases(t, {
      file: FILE,
      task: 4,
      attrs: ATTRS,
      methods: METHODS,
      owners: OWNERS,
      list: [
        { name: 'A pack without its flask', steps: steps('Morag', 11, { rope: 4.5, flask: 1.25, stove: 2.5 }, 'flask') },
        { name: 'Another pack, another item', steps: steps('Ross', 6, { map: 0.5, helmet: 0.75 }, 'map') }
      ]
    })
  }
}

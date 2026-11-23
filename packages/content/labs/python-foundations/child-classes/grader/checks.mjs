import { classCases, tuple } from '../../grading.mjs'

const FILE = 'kit.py'
const ATTRS = ['name', 'kg', 'metres', 'charge']
const METHODS = ['label', 'ready']

// Check's own Rope, so a mistake in Tasks 1 and 2 does not count in Tasks 3 and 4.
const ROPE = `
class Rope(Kit):
    def __init__(self, name, kg, metres):
        super().__init__(name, kg)
        self.metres = metres
`

// Notes, on each object, that Kit's own __init__ ran for it.
const NOTE_INIT = {
  code: `_kit_init = Kit.__init__
def _noted(self, *args, **kwargs):
    _kit_init(self, *args, **kwargs)
    self._kit_ran = True
Kit.__init__ = _noted`,
  hidden: "# Check notes, on each object, whether Kit's own __init__ ran for it"
}

const NEEDS = 'Task 1 is not right yet, and Check makes the ropes for this task with your Rope.'

const s = JSON.stringify

function ropeSteps([name, kg, metres], [otherName, otherKg, otherMetres]) {
  return [
    NOTE_INIT,
    { code: `rope = Rope(${s(name)}, ${kg}, ${metres})` },
    {
      code: 'isinstance(rope, Kit)',
      want: true,
      hint: 'A Rope is not a Kit: Rope is not built on Kit. The class line names the class it builds on, in round brackets after its name.'
    },
    { code: 'rope.metres', want: metres, hint: 'The rope does not keep the length it was made with in its attribute metres.' },
    {
      code: '(rope.name, rope.kg)',
      want: tuple(name, kg),
      hint: 'The rope does not have the name and the weight it was made with. Kit\'s __init__ keeps them, when Rope hands them to it.'
    },
    {
      code: 'getattr(rope, "_kit_ran", False)',
      want: true,
      hidden: true,
      hint: 'Rope\'s __init__ does not run Kit\'s own __init__: it keeps the name and the weight itself. Hand them to Kit\'s __init__ with super(), so that whatever Kit does when a piece of kit is made, a rope gets too.'
    },
    { code: 'rope.ready()', want: true, hint: 'A rope does not say it is ready, as every piece of kit does that has no ready of its own.' },
    { code: `other = Rope(${s(otherName)}, ${otherKg}, ${otherMetres})` },
    { code: 'rope.metres', want: metres, hint: 'After a second rope was made, the first rope\'s length changed. Keep the length on each rope, through self.' }
  ]
}

const madeRope = (code) => [
  { code, needs: NEEDS },
  {
    code: 'isinstance(rope, Kit)',
    want: true,
    needs: NEEDS,
    hint: 'A Rope is not a Kit: Rope is not built on Kit.'
  }
]

const NOT_READY = (error) =>
  /^NotReady\(\) takes no arguments$/.test(error.message)
    ? 'NotReady is not built on Exception, so it takes no message. The class line of an error names Exception in round brackets, and then NotReady(...) takes a message, as ValueError does'
    : /^exceptions must derive from BaseException$/.test(error.message)
      ? 'raise takes an error, and NotReady is not built on Exception. The class line of an error names Exception in round brackets'
      : null

const FLARE = {
  code: `class Flare(Kit):
    def __init__(self, name, kg, used):
        super().__init__(name, kg)
        self.used = used

    def ready(self):
        return not self.used`
}

export const checks = {
  rope(t) {
    return classCases(t, {
      file: FILE,
      task: 1,
      attrs: ATTRS,
      methods: METHODS,
      names: { Rope: 'class' },
      explain: (error) =>
        /^'Rope' object has no attribute '(name|kg)'/.test(error.message)
          ? "a Rope has no name or kg. Kit's __init__ keeps them, and it runs for a rope only when Rope's __init__ hands them to it with super()"
          : null,
      list: [
        { name: 'A rope is kit with a length', steps: ropeSteps(['static line', 4.5, 50], ['dynamic rope', 3.75, 60]) },
        { name: 'Another rope', steps: ropeSteps(['abseil rope', 5.25, 70], ['throw line', 0.75, 20]) }
      ]
    })
  },

  label(t) {
    const label = (code, want, copied, kits) => ({
      code,
      want,
      hint: (v, seen, rec) =>
        v === null
          ? `${code} gives back None: Rope's label ends without return.${rec.printed ? ' print only shows the label; return gives it back.' : ''}`
          : v === kits
          ? `${code} gives Kit's label, with no length: Rope has no label of its own. A method of Rope is moved in under Rope, lined up with its __init__.`
          : v === copied
          ? "Rope's label does not build on Kit's: Check gave Kit a label written another way, and Rope's label stayed as it was. Copying Kit's code into Rope means a change to Kit never reaches the ropes. Get Kit's label from Rope's with super(), and add to what it gives back."
          : typeof v === 'string' && v.startsWith('<bound method')
              ? "Rope's label puts the method itself into its text, not what it gives back: a method runs only with round brackets after its name."
              : `${code} is not Kit's label for the rope, then a comma, a space and the length in the shape the task shows.`
    })
    return classCases(t, {
      file: FILE,
      task: 2,
      attrs: ATTRS,
      methods: METHODS,
      names: { Rope: 'class' },
      explain: (error) =>
        error.type === 'RecursionError'
          ? "a method calls itself, and that call calls it again, without end. self.label() inside Rope's label is Rope's label again: Kit's label for this rope is reached through super()"
          : null,
      list: [
        {
          name: "A rope's label, and the others as they were",
          steps: [
            ...madeRope('rope = Rope("static line", 4.5, 50)'),
            label('rope.label()', 'static line (4.5 kg), 50 m', null, 'static line (4.5 kg)'),
            {
              code: 'Kit("map", 0.25).label()',
              want: 'map (0.25 kg)',
              hint: "Kit's own label changed. Give Rope a label of its own, moved in under Rope, and leave Kit's as it was."
            },
            {
              code: 'Battery("radio battery", 0.5, 80).label()',
              want: 'radio battery (0.5 kg)',
              hint: "A battery's label changed. Only ropes get the length added: give Rope a label of its own, moved in under Rope."
            }
          ]
        },
        {
          name: "A rope's label builds on Kit's",
          steps: [
            {
              code: 'Kit.label = lambda self: f"{self.name} [{self.kg} kg]"',
              hidden: "# Check gives Kit a label written another way: the weight in square brackets"
            },
            ...madeRope('rope = Rope("dynamic rope", 3.75, 60)'),
            label('rope.label()', 'dynamic rope [3.75 kg], 60 m', 'dynamic rope (3.75 kg), 60 m', 'dynamic rope [3.75 kg]')
          ]
        }
      ]
    })
  },

  ropes(t) {
    const kinds = { code: 'class StaticRope(Rope):\n    pass' }
    const named = (code, want, kit) => {
      const statics = kit.filter((m) => m.startsWith('StaticRope(')).map((m) => /"([^"]+)"/.exec(m)[1])
      return {
        code,
        want,
        hint: (v) => {
          const left = Array.isArray(v) && statics.find((n) => !v.includes(n))
          return Array.isArray(v) && v.length === kit.length && kit.length !== want.length
            ? 'ropes_in gives back every piece of kit, not only the ropes. Every piece of kit is a Kit: ask whether each one is a Rope.'
            : left && v.every((n) => want.includes(n))
              ? `ropes_in leaves out the ${left}, a StaticRope: a kind of rope built on Rope. type(item) == Rope is True only for a Rope itself; the task asks for every kind of rope too, and isinstance asks about the class and every class built on it.`
              : 'ropes_in does not give back the ropes of the list, in the same order.'
        }
      }
    }
    const steps = (made, want) => [
      kinds,
      { code: `kit = [${made.join(', ')}]` },
      { code: 'found = ropes_in(kit)' },
      {
        code: 'type(found).__name__',
        want: 'list',
        hint: (v) => (v === 'NoneType' ? 'ropes_in gives back None: it ends without return.' : `ropes_in gives back a ${v}, and the task asks for a list.`),
        hidden: '# Check asks what kind of value ropes_in gave back'
      },
      named('[item.name for item in found]', want, made),
      {
        code: '[item.name for item in kit]',
        want: made.map((m) => /"([^"]+)"/.exec(m)[1]),
        hint: 'ropes_in changed the list of kit it was given. Leave it as it was, and build a new list.'
      }
    ]
    return classCases(t, {
      file: FILE,
      task: 3,
      define: ROPE,
      attrs: ATTRS,
      names: { ropes_in: 'function' },
      explain: (error) =>
        /^'(str|int|float)' object has no attribute 'name'/.test(error.message)
          ? 'ropes_in gives back a list that holds something other than kit, such as each rope\'s name. Put each rope itself into the list'
          : null,
      list: [
        {
          name: 'Ropes of two kinds among other kit',
          steps: steps(
            ['Rope("dynamic rope", 3.75, 60)', 'Battery("radio battery", 0.5, 80)', 'StaticRope("static line", 4.5, 50)', 'Kit("map", 0.25)'],
            ['dynamic rope', 'static line']
          )
        },
        { name: 'No ropes at all', steps: steps(['Kit("map", 0.25)', 'Battery("spare battery", 0.5, 20)'], []) },
        {
          name: 'Only ropes',
          steps: steps(['StaticRope("abseil rope", 5.25, 70)', 'Rope("throw line", 0.75, 20)'], ['abseil rope', 'throw line'])
        }
      ]
    })
  },

  ready(t) {
    const base = [
      {
        code: 'issubclass(NotReady, Exception)',
        want: true,
        hint: 'NotReady is not built on Exception. The class line of an error names Exception in round brackets, and only then can raise use it.'
      },
      FLARE
    ]
    const refused = (kit, first, other, all) => [
      ...base,
      { code: `kit = [${kit.join(', ')}]` },
      {
        code: 'check_kit(kit)',
        value: true,
        raises: {
          type: 'NotReady',
          own: true,
          has: [first],
          names: `the first item that is not ready, the ${first}`,
          wrongType: 'Here the task asks for NotReady, the error class of your own.',
          hasHint: (message) =>
            other && message.includes(other)
              ? `check_kit names the ${other}, but the ${first} before it is not ready either. A Flare is a kind of kit check_kit has never heard of, and it knows whether it is ready: ask each item with its own ready method, in order.`
              : `check_kit raises NotReady, but its message does not name the first item that is not ready, the ${first}. Put the item's name into the message.`,
          swallowed: (rec) =>
            `check_kit(kit) ${rec.printed ? 'printed a line and ' : ''}gave back ${rec.value?.repr ?? 'a value'}, though the ${first} is not ready.${(rec.value?.data?.['@float'] ?? rec.value?.data) === all ? ' That is the weight of every item, as if all were ready: a method used without round brackets is the method itself, and Python counts it as true.' : ''} The task asks check_kit to raise NotReady.`
        }
      }
    ]
    return classCases(t, {
      file: FILE,
      task: 4,
      define: ROPE,
      attrs: ATTRS,
      explain: NOT_READY,
      names: { NotReady: 'class', check_kit: 'function' },
      list: [
        {
          name: 'Every item ready',
          steps: [
            ...base,
            { code: 'kit = [Rope("dynamic rope", 3.75, 60), Battery("radio battery", 0.5, 80), Flare("red flare", 0.25, False), Kit("map", 0.25)]' },
            {
              code: 'check_kit(kit)',
              want: 4.75,
              ownHint: 'Every item of this list is ready: look at how check_kit asks each one.',
              hint: (v) =>
                v === null
                  ? 'check_kit gives back None: it ends without return. When every item is ready it gives back the total weight.'
                  : (v?.['@float'] ?? v) === 3.75
                    ? 'check_kit gives back the weight of the first item only: a return inside the loop ends it after the first item. Give back the total after the loop.'
                    : 'check_kit does not give back the total weight of the list.'
            }
          ]
        },
        { name: 'A flat battery', steps: refused(['Rope("dynamic rope", 3.75, 60)', 'Battery("radio battery", 0.5, 30)', 'Flare("red flare", 0.25, True)'], 'radio battery', undefined, 4.5) },
        {
          name: 'A used flare, a kind of kit check_kit has never seen',
          steps: refused(['Kit("map", 0.25)', 'Flare("red flare", 0.25, True)', 'Battery("spare battery", 0.5, 20)'], 'red flare', 'spare battery', 1)
        },
        {
          name: 'Nothing to check',
          steps: [
            ...base,
            {
              code: 'check_kit([])',
              want: 0,
              hint: (v) =>
                v === null
                  ? 'check_kit([]) gives back None. With nothing in the list the loop never runs: give back the total after the loop, where an empty list reaches it too.'
                  : 'check_kit of an empty list does not give back 0.'
            }
          ]
        }
      ]
    })
  }
}

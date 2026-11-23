import { codeOnly, near, objectCases, refusal, tasks } from '../../grading.mjs'

const value = (r, name) => r.values[name]?.value

// Kinds of vessel of Check's own, written in main, so only the fare of the vessel itself can
// give the right answer: not a fare typed in, and not one picked by the vessel's name.
const FLAT = 'class Flat extends Vessel { int pence; Flat(String n, int p) { super(n); pence = p; } @Override public int fareFor(int age) { return pence; } }'
const BY_AGE = 'class ByAge extends Vessel { ByAge(String n) { super(n); } @Override public int fareFor(int age) { return age * 10 + 5; } }'

// Check's own Vessel, so Tasks 2 and 3 are judged on their own lines, whatever Task 1 is like.
const OWN_VESSEL = `abstract class Vessel {
    private String name;
    Vessel(String name) { this.name = name; }
    String getName() { return name; }
    abstract int fareFor(int age);
    String fareLine(int age) { return name + ": " + fareFor(age) + "p"; }
}`

const list = (v, items) => [`java.util.ArrayList<Vessel> ${v} = new java.util.ArrayList<>();`, ...items.map((x) => `${v}.add(${x});`)]

export const checks = tasks({
  file: 'Takings.java',
  objects: true,
  families: true,
  tasks: {
    vessel: {
      task: 1,
      cases: [
        {
          name: 'Gives back the name and the fare line of a vessel',
          code: [BY_AGE, 'Vessel v = new ByAge("Tern");'],
          show: 'A kind of vessel of Check\'s own whose fare for an age is age * 10 + 5:\nVessel v = new ByAge("Tern");',
          reads: { 'v.getName()': 'v.getName()', 'v.fareLine(7)': 'v.fareLine(7)', 'v.fareLine(30)': 'v.fareLine(30)' },
          expected: { 'v.getName()': 'Tern', 'v.fareLine(7)': 'Tern: 75p', 'v.fareLine(30)': 'Tern: 305p' }
        },
        {
          name: 'Each vessel keeps its own name and fare',
          code: [FLAT, BY_AGE, 'Vessel a = new Flat("Skua", 250);', 'Vessel b = new ByAge("Fulmar");'],
          show: 'Two kinds of vessel of Check\'s own: Flat charges the pence it is made with, ByAge charges age * 10 + 5.\nVessel a = new Flat("Skua", 250);\nVessel b = new ByAge("Fulmar");',
          reads: { 'a.fareLine(40)': 'a.fareLine(40)', 'b.fareLine(2)': 'b.fareLine(2)' },
          expected: { 'a.fareLine(40)': 'Skua: 250p', 'b.fareLine(2)': 'Fulmar: 25p' }
        },
        {
          name: 'Cannot be made by itself',
          refuse: true,
          code: ['Vessel v = new Vessel("Tern");'],
          error: /is abstract; cannot be instantiated/,
          allowed: 'Check\'s own code made a Vessel with new, and Java let it: Vessel is not abstract. A vessel is always some kind of vessel, and abstract in front of the class makes Java refuse one made by itself.'
        },
        {
          name: 'Makes every kind of vessel write fareFor',
          refuse: true,
          code: ['class Bare extends Vessel { Bare() { super("Tern"); } }'],
          show: 'class Bare extends Vessel { Bare() { super("Tern"); } }',
          error: /does not override abstract method fareFor\(int\)/,
          allowed: 'Check\'s own class extends Vessel and writes no fareFor, and Java let it: fareFor is not abstract in Vessel, so a kind of vessel could forget its fare. An abstract method has no body, and every class that extends Vessel must write it.'
        }
      ].map((c) => ({ ...c, hint: 'fareLine should give back the vessel\'s name, a colon and a space, then the fare that vessel\'s own fareFor gives for the age, and a p.' })),
      judge: (runs) => {
        const said = (r) => value(r, 'v.fareLine(7)') ?? value(r, 'a.fareLine(40)') ?? ''
        const want = (r) => r.case.expected['v.fareLine(7)'] ?? r.case.expected['a.fareLine(40)']
        return [
          ...objectCases({
            types: { 'v.fareLine(7)': 'String', 'v.getName()': 'String' },
            mistakes: [
              {
                when: (r, own) => own.every((x) => said(x) === said(own[0])),
                hint: 'fareLine gives back the same text for every vessel Check makes. Build it from the vessel\'s own name and what its own fareFor gives back.'
              },
              {
                when: (r) => value(r, 'b.fareLine(2)')?.startsWith('Fulmar') && value(r, 'a.fareLine(40)')?.startsWith('Fulmar'),
                hint: 'Check made two vessels, and the first now has the second one\'s name. name is shared by every vessel: a field with static in front belongs to the class. Each needs its own.'
              },
              {
                when: (r) => said(r).replace(/\d+/g, '#') === want(r).replace(/\d+/g, '#'),
                hint: 'The words are right, and the fare is not. fareLine should show what this vessel\'s own fareFor gives back for the age it is given.'
              },
              {
                when: (r) => near(said(r), want(r)),
                hint: 'fareLine is nearly right. Compare it with the task letter by letter: the colon, the space and the p count.'
              }
            ]
          })(runs),
          ...runs.filter((r) => r.case.refuse).map((r) => refusal(r, r.case))
        ]
      }
    },

    kinds: {
      task: 2,
      stub: OWN_VESSEL,
      cases: [
        {
          name: 'A ferry charges by age',
          code: ['Vessel a = new Ferry("Tern");'],
          reads: { 'a.fareFor(9)': 'a.fareFor(9)', 'a.fareFor(15)': 'a.fareFor(15)', 'a.fareFor(16)': 'a.fareFor(16)', 'a.fareFor(64)': 'a.fareFor(64)', 'a.getName()': 'a.getName()' },
          expected: { 'a.fareFor(9)': 160, 'a.fareFor(15)': 160, 'a.fareFor(16)': 320, 'a.fareFor(64)': 320, 'a.getName()': 'Tern' },
          hint: 'On a ferry under 16 pay 160 and everyone else 320, and the ferry keeps the name it was made with.'
        },
        {
          name: 'A water taxi charges the same at every age',
          code: ['Vessel b = new WaterTaxi("Smew");'],
          reads: { 'b.fareFor(9)': 'b.fareFor(9)', 'b.fareFor(40)': 'b.fareFor(40)', 'b.getName()': 'b.getName()' },
          expected: { 'b.fareFor(9)': 600, 'b.fareFor(40)': 600, 'b.getName()': 'Smew' },
          hint: 'The water taxi charges 600 whatever the age, and keeps the name it was made with.'
        },
        {
          name: 'Each kind answers for itself in a list of vessels',
          code: [...list('trips', ['new Ferry("Skua")', 'new WaterTaxi("Fulmar")'])],
          show: 'ArrayList<Vessel> trips = new ArrayList<>();\ntrips.add(new Ferry("Skua"));\ntrips.add(new WaterTaxi("Fulmar"));',
          reads: { 'trips.get(0).fareLine(40)': 'trips.get(0).fareLine(40)', 'trips.get(1).fareLine(9)': 'trips.get(1).fareLine(9)' },
          expected: { 'trips.get(0).fareLine(40)': 'Skua: 320p', 'trips.get(1).fareLine(9)': 'Fulmar: 600p' },
          hint: 'Held in a list of Vessel, each kind should still give its own fare.'
        }
      ],
      judge: objectCases({
        types: { 'a.fareFor(9)': 'int', 'b.fareFor(9)': 'int' },
        mistakes: [
          {
            when: (r) => value(r, 'a.fareFor(16)') === '160' || value(r, 'a.fareFor(15)') === '320',
            hint: 'The ferry\'s fare changes at the wrong age. Someone of 15 is under 16 and pays 160; someone of 16 pays 320.'
          },
          {
            when: (r) => value(r, 'b.fareFor(9)') !== undefined && value(r, 'b.fareFor(9)') !== value(r, 'b.fareFor(40)'),
            hint: 'The water taxi charges by age. It charges the same whatever the age.'
          }
        ]
      })
    },

    'day-trips': {
      task: 3,
      stub: OWN_VESSEL,
      cases: [
        {
          name: 'Adds up each trip at its own vessel\'s fare',
          code: [FLAT, BY_AGE, ...list('trips', ['new Flat("Tern", 250)', 'new ByAge("Skua")']), 'int got = DayTrips.cost(trips, 20);'],
          show: 'Two kinds of vessel of Check\'s own: Flat charges the pence it is made with, ByAge charges age * 10 + 5.\nArrayList<Vessel> trips: new Flat("Tern", 250), new ByAge("Skua")\nint got = DayTrips.cost(trips, 20);',
          reads: { got: 'got' },
          expected: { got: 455 }
        },
        {
          name: 'Uses the age it is given',
          code: [FLAT, BY_AGE, ...list('trips', ['new Flat("Tern", 250)', 'new ByAge("Skua")']), 'int got = DayTrips.cost(trips, 5);'],
          show: 'ArrayList<Vessel> trips: new Flat("Tern", 250), new ByAge("Skua")\nint got = DayTrips.cost(trips, 5);',
          reads: { got: 'got' },
          expected: { got: 305 }
        },
        {
          name: 'Counts a vessel taken twice twice',
          code: [FLAT, BY_AGE, 'Vessel x = new Flat("Fulmar", 90);', ...list('trips', ['x', 'new ByAge("Eider")', 'x']), 'int got = DayTrips.cost(trips, 3);'],
          show: 'Vessel x = new Flat("Fulmar", 90);\nArrayList<Vessel> trips: x, new ByAge("Eider"), x\nint got = DayTrips.cost(trips, 3);',
          reads: { got: 'got' },
          expected: { got: 215 }
        },
        {
          name: 'Costs nothing for a day with no trips',
          code: ['java.util.ArrayList<Vessel> trips = new java.util.ArrayList<>();', 'int got = DayTrips.cost(trips, 40);'],
          show: 'ArrayList<Vessel> trips = new ArrayList<>();\nint got = DayTrips.cost(trips, 40);',
          reads: { got: 'got' },
          expected: { got: 0 }
        }
      ].map((c) => ({ ...c, hint: 'cost should add up, for every trip in the list, what that trip\'s own vessel charges for the age.' })),
      judge: (runs, { section }) =>
        objectCases({
          types: { got: 'int' },
          typed: 'cost gives back the same number whatever trips and age Check passes. Work it out from the list and the age.',
          mistakes: [
            {
              when: (r) => r.case.expected.got === 455 && ['250', '205'].includes(value(r, 'got')),
              hint: 'cost counts only one of the trips. Every trip in the list adds its own fare.'
            },
            {
              when: () => !/\.\s*fareFor\s*\(/.test(codeOnly(section)),
              hint: 'cost works out each fare itself, from what it knows about the kinds of vessel, so it is wrong for Check\'s own kinds, which it has never seen. Ask each vessel for its own fare: then the loop never needs to know what kind it holds.'
            }
          ]
        })(runs)
    }
  }
})

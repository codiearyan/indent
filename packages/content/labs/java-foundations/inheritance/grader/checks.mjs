import { codeOnly, fail, near, objectCases, pass, ran, tasks } from '../../grading.mjs'

const value = (r, name) => r.values[name]?.value

/** The lines of one class under a task, without comments or text. */
const classBody = (section, name) => {
  const code = codeOnly(section)
  const at = code.search(new RegExp(`\\bclass\\s+${name}\\b`))
  return at < 0 ? '' : code.slice(at)
}

/** A field of Boat written again in the child: then a child object has two of it. */
const twice = (section, name) => {
  const field = /(?:^|[;{}])\s*(?:private\s+|protected\s+|public\s+|final\s+)*(?:String|int)\s+(name|seats)\s*[;=]/.exec(classBody(section, name))?.[1]
  return field
    ? [
        fail(
          `${name} uses the ${field} it gets from Boat`,
          `${name} makes a field called ${field} of its own, so each ${name} has two: its own, and the one it gets from Boat, which Boat's methods use. A child already has every field of its parent; hand the value to Boat's constructor instead.`
        )
      ]
    : []
}

/** @Override above the method a task overrides. */
const marked = (section, name, method) =>
  new RegExp(`@Override\\s+(?:(?:public|protected|final|synchronized|strictfp)\\s+)*\\w+\\s+${method}\\s*\\(`).test(classBody(section, name))
    ? pass(`${method} is marked @Override`)
    : fail(
        `${method} is marked @Override`,
        `${method} does its job, and the task also asks for @Override on the line above it. With it, the compiler checks that ${method} really takes the place of Boat's, and says so when a name or a parameter type is off.`
      )

// Check's own Boat for Task 3: the same methods, but its describe words things its own way, so a
// describe that copies the starter's Boat instead of asking Boat for its part shows.
const OWN_BOAT = `class Boat {
    private String name;
    private int seats;
    Boat(String name, int seats) { this.name = name; this.seats = seats; }
    String getName() { return name; }
    int getSeats() { return seats; }
    int fareFor(int age) { return age < 16 ? 160 : 320; }
    String describe() { return name + " (" + seats + " seats)"; }
}`

export const checks = tasks({
  file: 'BoatKinds.java',
  objects: true,
  families: true,
  tasks: {
    'bike-ferry': {
      task: 1,
      cases: [
        {
          name: 'Hands its name and seats to Boat, and keeps its bike spaces',
          code: ['BikeFerry f = new BikeFerry("Tern", 9, 4);', 'Boat b = f;'],
          reads: { 'b.getName()': 'b.getName()', 'b.getSeats()': 'b.getSeats()', 'f.getBikeSpaces()': 'f.getBikeSpaces()' },
          expected: { 'b.getName()': 'Tern', 'b.getSeats()': 9, 'f.getBikeSpaces()': 4 },
          hint: 'A BikeFerry should give back, through Boat\'s getters, the name and seats it was made with, and its own bike spaces through getBikeSpaces.'
        },
        {
          name: 'Gets fareFor and describe from Boat',
          code: ['Boat b = new BikeFerry("Skua", 30, 12);'],
          reads: { 'b.fareFor(9)': 'b.fareFor(9)', 'b.fareFor(40)': 'b.fareFor(40)', 'b.describe()': 'b.describe()' },
          expected: { 'b.fareFor(9)': 160, 'b.fareFor(40)': 320, 'b.describe()': 'Skua: 30 seats' },
          hint: 'A BikeFerry is a Boat, so Boat\'s fareFor and describe should work on it just as on any boat, with its own name and seats.'
        },
        {
          name: 'Each bike ferry keeps its own values',
          code: ['BikeFerry a = new BikeFerry("Fulmar", 16, 6);', 'BikeFerry c = new BikeFerry("Eider", 5, 3);'],
          reads: { 'a.getName()': 'a.getName()', 'a.getSeats()': 'a.getSeats()', 'a.getBikeSpaces()': 'a.getBikeSpaces()', 'c.getBikeSpaces()': 'c.getBikeSpaces()' },
          expected: { 'a.getName()': 'Fulmar', 'a.getSeats()': 16, 'a.getBikeSpaces()': 6, 'c.getBikeSpaces()': 3 },
          hint: 'Each bike ferry should keep the values it was made with, whatever other bike ferries are made after it.'
        }
      ],
      judge: (runs, { section }) => [
        ...twice(section, 'BikeFerry'),
        ...objectCases({
          types: { 'f.getBikeSpaces()': 'int' },
          mistakes: [
            {
              when: (r) => value(r, 'c.getBikeSpaces()') === '3' && value(r, 'a.getBikeSpaces()') === '3',
              hint: 'Check made two bike ferries, and the first now gives back the second one\'s bike spaces. bikeSpaces is shared by every bike ferry: a field with static in front belongs to the class. Each needs its own.'
            },
            {
              when: (r) => value(r, 'b.getName()') === null || value(r, 'a.getName()') === null || value(r, 'b.getName()') === '' || value(r, 'b.getSeats()') === '0',
              hint: 'Boat\'s getters give back an empty name or 0 seats, so Boat\'s own fields never got the values Check passed. They are set by Boat\'s constructor: hand it the name and the seats.'
            },
            {
              when: (r) => ['b.getName()', 'a.getName()'].some((k) => r.case.expected[k] !== undefined && value(r, k) !== r.case.expected[k]),
              hint: 'Boat\'s getName gives back a name Check never passed. The constructor should hand Boat the name and the seats it is given, not values of its own.'
            },
            {
              when: (r) => value(r, 'f.getBikeSpaces()') === '0' || value(r, 'a.getBikeSpaces()') === '0',
              hint: 'getBikeSpaces gives back 0: the constructor never keeps the bike spaces it is given.'
            }
          ]
        })(runs)
      ]
    },

    'night-boat': {
      task: 2,
      cases: [
        {
          name: 'Charges the night fare, through a Boat variable',
          code: ['Boat b = new NightBoat("Tern", 8);'],
          reads: { 'b.fareFor(40)': 'b.fareFor(40)', 'b.fareFor(16)': 'b.fareFor(16)', 'b.fareFor(70)': 'b.fareFor(70)' },
          expected: { 'b.fareFor(40)': 450, 'b.fareFor(16)': 450, 'b.fareFor(70)': 450 },
          hint: 'At night everyone 16 or over pays 450, and fareFor should say so even when Check holds the boat in a variable of type Boat.'
        },
        {
          name: 'Lets under 16s travel free at night',
          code: ['Boat b = new NightBoat("Skua", 20);'],
          reads: { 'b.fareFor(9)': 'b.fareFor(9)', 'b.fareFor(15)': 'b.fareFor(15)', 'b.fareFor(0)': 'b.fareFor(0)' },
          expected: { 'b.fareFor(9)': 0, 'b.fareFor(15)': 0, 'b.fareFor(0)': 0 },
          hint: 'At night under 16 travel free, so fareFor should give back 0 for them.'
        },
        {
          name: 'Is still a Boat in everything else',
          code: ['NightBoat n = new NightBoat("Fulmar", 6);', 'Boat b = n;'],
          reads: { 'b.getName()': 'b.getName()', 'b.describe()': 'b.describe()', 'n.fareFor(30)': 'n.fareFor(30)' },
          expected: { 'b.getName()': 'Fulmar', 'b.describe()': 'Fulmar: 6 seats', 'n.fareFor(30)': 450 },
          hint: 'A night boat keeps the name and seats it was made with, and Boat\'s describe works on it as on any boat.'
        }
      ],
      judge: (runs, { section }) => {
        const details = objectCases({
          types: { 'b.fareFor(40)': 'int', 'b.fareFor(9)': 'int' },
          mistakes: [
            {
              when: (r) => ['b.fareFor(40)', 'n.fareFor(30)'].some((k) => value(r, k) === '320') || value(r, 'b.fareFor(9)') === '160',
              hint: 'Check holds the night boat in a variable of type Boat, and Boat\'s own fareFor ran, not NightBoat\'s. A method takes the place of the parent\'s only when its name and parameter types are exactly the same: compare NightBoat\'s fareFor with Boat\'s. @Override above it makes the compiler say when they differ.'
            },
            {
              when: (r) => value(r, 'b.fareFor(16)') === '0' || value(r, 'b.fareFor(15)') === '450',
              hint: 'The fare changes at the wrong age. Someone of 15 is under 16 and travels free; someone of 16 pays.'
            }
          ]
        })(runs)
        return details.every((d) => d.passed) ? [...details, marked(section, 'NightBoat', 'fareFor')] : details
      }
    },

    'charter-boat': {
      task: 3,
      stub: OWN_BOAT,
      cases: [
        {
          name: 'Says who hired it, after Boat\'s own describe',
          code: ['Boat b = new CharterBoat("Tern", 9, "Morag");'],
          reads: { 'b.describe()': 'b.describe()' },
          expected: { 'b.describe()': 'Tern (9 seats), hired by Morag' },
          plain: 'Tern: 9 seats, hired by Morag'
        },
        {
          name: 'Is a Boat in everything else',
          code: ['CharterBoat c = new CharterBoat("Skua", 2, "Lachie");', 'Boat b = c;'],
          reads: { 'b.describe()': 'b.describe()', 'b.getName()': 'b.getName()', 'b.fareFor(40)': 'b.fareFor(40)' },
          expected: { 'b.describe()': 'Skua (2 seats), hired by Lachie', 'b.getName()': 'Skua', 'b.fareFor(40)': 320 },
          plain: 'Skua: 2 seats, hired by Lachie'
        },
        {
          name: 'Each charter boat keeps who hired it',
          code: ['Boat a = new CharterBoat("Fulmar", 12, "Ishbel");', 'Boat c = new CharterBoat("Eider", 4, "Rab");'],
          reads: { 'a.describe()': 'a.describe()', 'c.describe()': 'c.describe()' },
          expected: { 'a.describe()': 'Fulmar (12 seats), hired by Ishbel', 'c.describe()': 'Eider (4 seats), hired by Rab' },
          plain: 'Fulmar: 12 seats, hired by Ishbel'
        }
      ].map((c) => ({
        ...c,
        hint: 'describe should give back what Boat\'s own describe gives back, then a comma, a space, hired by, a space and the name.'
      })),
      judge: (runs, { section }) => {
        const said = (r) => value(r, 'b.describe()') ?? value(r, 'a.describe()') ?? ''
        const want = (r) => r.case.expected['b.describe()'] ?? r.case.expected['a.describe()']
        const details = objectCases({
          types: { 'b.describe()': 'String' },
          mistakes: [
            {
              when: (r) => said(r).endsWith('hired by null'),
              hint: 'describe says hired by null: the constructor never keeps the hirer it is given.'
            },
            {
              when: (r) => said(r).endsWith('hired by Struan'),
              hint: 'describe gives back a hirer Check never passed. Use this boat\'s own hiredBy, kept by the constructor.'
            },
            {
              when: (r, own) => own.every((x) => said(x) === said(own[0])),
              hint: 'describe gives back the same text for every boat Check makes. Build it from Boat\'s describe and this boat\'s own hiredBy.'
            },
            {
              when: (r) => said(r) === r.case.plain,
              hint: 'describe writes Boat\'s part itself. Check runs it beside a Boat of its own whose describe words things its own way, and yours did not follow. Ask Boat\'s describe for its part, as the lesson shows, instead of writing it again.'
            },
            {
              when: (r) => !said(r).includes('hired by'),
              hint: 'Check holds the charter boat in a variable of type Boat, and Boat\'s own describe ran, not CharterBoat\'s. A method takes the place of the parent\'s only when its name and parameters are exactly the same, capital letters included. @Override above it makes the compiler say when they differ.'
            },
            {
              when: (r) => value(r, 'c.describe()') !== undefined && value(r, 'a.describe()')?.endsWith('Rab'),
              hint: 'Check made two charter boats, and the first now says the second one\'s hirer. hiredBy is shared by every charter boat: a field with static in front belongs to the class. Each needs its own.'
            },
            {
              when: (r) => near(said(r), want(r)),
              hint: 'describe is nearly right. Compare what comes after Boat\'s part with the task, letter by letter: the comma, the spaces and the words count.'
            }
          ]
        })(runs)
        return details.every((d) => d.passed) ? [...details, marked(section, 'CharterBoat', 'describe')] : details
      }
    }
  }
})

import { classCases, tuple } from '../../grading.mjs'

const FILE = 'hill_teams.py'

// Check's own Team, so a mistake in Task 1 does not count in Task 3.
const TEAM = `
class Team:
    def __init__(self, call_sign, leader):
        self.call_sign = call_sign
        self.leader = leader
`

const STORY = ['Alpha', 'Bravo', 'Charlie', 'Kirsty', 'Iain', 'Shona']

/** The words for an attribute read back that is not the one Check gave. */
const attrHint = (attr, given, other) => (v) =>
  v === other
    ? `After a second team was made, the first team's ${attr} is the second team's. The value is kept on the class, shared by every team, not on each object: a line such as self.${attr} = ... keeps it on the new object itself.`
    : STORY.includes(v)
      ? `Team keeps ${JSON.stringify(v)}, a value from the story, whatever it is given. Keep the value the call gives, through the parameter of __init__.`
      : `The team's ${attr} is not the ${attr} Check made it with, ${JSON.stringify(given)}. __init__ keeps each value it is given in the attribute of that name.`

function teamSteps([firstSign, firstLeader], [secondSign, secondLeader]) {
  return [
    { code: 'type(Team).__name__', want: 'type', hidden: true, hint: 'Team is not a class. A class is made with class, its name and a colon.' },
    { code: `first = Team(${JSON.stringify(firstSign)}, ${JSON.stringify(firstLeader)})` },
    { code: `second = Team(${JSON.stringify(secondSign)}, ${JSON.stringify(secondLeader)})` },
    { code: 'first.call_sign', want: firstSign, hint: attrHint('call_sign', firstSign, secondSign) },
    { code: 'first.leader', want: firstLeader, hint: attrHint('leader', firstLeader, secondLeader) },
    { code: 'second.call_sign', want: secondSign, hint: attrHint('call_sign', secondSign) },
    { code: 'second.leader', want: secondLeader, hint: attrHint('leader', secondLeader) }
  ]
}

const VEHICLE_SHARED =
  'Every vehicle has the same kit list: what one vehicle carries shows up in all of them. A list written in the class, outside __init__, belongs to the class and is shared by every object, and so is a default list in the def line, made once. Make a new list for each vehicle, in __init__, on self.'

export const checks = {
  team(t) {
    return classCases(t, {
      file: FILE,
      task: 1,
      names: { Team: 'class' },
      list: [
        { name: 'Two teams, each with its own values', steps: teamSteps(['Mike', 'Ross'], ['November', 'Morag']) },
        { name: 'Two more teams', steps: teamSteps(['Oscar', 'Ailsa'], ['Papa', 'Dougie']) }
      ]
    })
  },

  kit(t) {
    const steps = (first, second) => [
      { code: `first = Vehicle(${JSON.stringify(first)})` },
      { code: `second = Vehicle(${JSON.stringify(second)})` },
      {
        code: 'first.name',
        want: first,
        hint: 'The vehicle does not keep the name it was made with in its attribute name. Keep the line of __init__ that does that.'
      },
      {
        code: 'first.kit',
        want: [],
        hint: (v, seen, rec) =>
          Array.isArray(v) && v.includes('rope')
            ? `A vehicle made just now already carries ${rec.value.repr}: what was put in another vehicle. ${VEHICLE_SHARED}`
            : Array.isArray(v) && v.length
              ? `A vehicle made just now already carries ${rec.value.repr}. The task asks for a new, empty list for every vehicle.`
              : 'A new vehicle\'s kit is not an empty list. The task asks for a new, empty list for every vehicle.'
      },
      { code: 'first.kit.append("stretcher")' },
      {
        code: 'second.kit',
        want: [],
        hint: (v) =>
          Array.isArray(v) && v.includes('stretcher')
            ? `A stretcher put in one vehicle shows up in the other. ${VEHICLE_SHARED}`
            : 'The second vehicle\'s kit is not an empty list after Check put a stretcher in the first.'
      },
      {
        code: 'first.kit',
        want: ['stretcher'],
        hint: 'After Check put a stretcher in a vehicle, its kit does not hold just the stretcher.'
      }
    ]
    return classCases(t, {
      file: FILE,
      task: 2,
      names: { Vehicle: 'class' },
      list: [
        { name: 'Kit put in one vehicle stays in that vehicle', steps: steps('Rescue 1', 'Rescue 2') },
        { name: 'Two more vehicles', steps: steps('Trailer', 'Quad') }
      ]
    })
  },

  rota(t) {
    const steps = (rows) => {
      const want = rows.map(([sign, leader]) => tuple(sign, leader))
      return [
        { code: `rows = [${rows.map(([s, l]) => `(${JSON.stringify(s)}, ${JSON.stringify(l)})`).join(', ')}]` },
        { code: 'teams = make_teams(rows)' },
        {
          code: 'type(teams).__name__',
          want: 'list',
          hidden: '# Check asks what kind of value make_teams gave back',
          hint: (v) =>
            v === 'NoneType'
              ? 'make_teams gives back None: it ends without reaching a return line. print only shows a line; the code that calls make_teams gets the list only from return.'
              : `make_teams gives back ${v === 'tuple' ? 'a tuple' : `a ${v}`}, and the task asks for a list.`
        },
        {
          code: '[type(team).__name__ for team in teams]',
          want: rows.map(() => 'Team'),
          hidden: '# Check asks what kind of value each item of the list is',
          hint: (v) =>
            v.length !== rows.length
              ? `make_teams gives back ${v.length} ${v.length === 1 ? 'item' : 'items'} for ${rows.length} ${rows.length === 1 ? 'row' : 'rows'}. The task asks for one team for each tuple.`
              : `make_teams gives back ${v.find((x) => x !== 'Team') === 'tuple' ? 'the tuples as they are' : `a ${v.find((x) => x !== 'Team')}`} in its list, not Team objects. Each tuple's two values go into Team(...), which makes a new team.`
        },
        {
          code: '[(team.call_sign, team.leader) for team in teams]',
          want,
          hint: (v) =>
            JSON.stringify(v).includes('"Alpha"')
              ? 'make_teams gives back the teams of the rota in the file, whatever list it is given. Make the teams from its parameter, the list Check hands it.'
              : want.length > 1 && v.every((pair) => JSON.stringify(pair) === JSON.stringify(v[0]))
              ? 'Every team in the list has the same call sign and leader. Each Team(...) call makes a new object, so make one in each round of the loop, not one before it that each round changes.'
              : 'The teams do not have the call signs and leaders of the tuples, in the same order.'
        },
        {
          code: 'len({id(team) for team in teams})',
          want: rows.length,
          hidden: '# Check counts the different Team objects in the list',
          hint: 'The list holds the same Team object more than once. Each Team(...) call makes a new object, so make one in each round of the loop.'
        },
        {
          code: 'rows',
          want,
          hint: 'make_teams changed the list of tuples it was given. Leave it as it was, and build a new list.'
        }
      ]
    }
    return classCases(t, {
      file: FILE,
      task: 3,
      define: TEAM,
      names: { make_teams: 'function' },
      list: [
        { name: 'Three teams, in order', steps: steps([['Delta', 'Ross'], ['Echo', 'Morag'], ['Foxtrot', 'Ross']]) },
        { name: 'One team', steps: steps([['Golf', 'Ailsa']]) },
        { name: 'No teams', steps: steps([]) }
      ]
    })
  }
}

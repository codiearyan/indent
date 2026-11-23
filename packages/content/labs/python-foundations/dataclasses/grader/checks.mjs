import { classCases, tuple } from '../../grading.mjs'

const FILE = 'callout_records.py'
const ATTRS = ['date', 'hill', 'hours', 'area', 'teams', 'easting', 'northing']
const s = JSON.stringify

const DATACLASS_ERROR = (error) => {
  const m = error.message
  if (/^(?:\w+\.)?__init__\(\) takes \d+ positional arguments? but \d+ were given$/.test(m)) {
    return 'the dataclass has fewer fields than the values Check gave it. A field is a name, a colon and a type, such as hours: int: a name given a value with = and no type is not a field, and @dataclass leaves it out of __init__'
  }
  if (/^'list' object is not callable$/.test(m)) {
    return 'default_factory takes the kind of value to make, list itself, with no round brackets: the dataclass calls it for each new object'
  }
  if (/is a field but has no type annotation/.test(m)) {
    return 'every field of a dataclass needs a type after a colon, such as area: str, the ones made with field() too'
  }
  return null
}

const isDataclass = (name) => ({
  code: `dataclasses.is_dataclass(${name})`,
  want: true,
  hint: `${name} is not a dataclass. The task asks for @dataclass, on the line above the class line: it writes __init__, __repr__ and __eq__ from the fields.`
})
const IMPORT = { code: 'import dataclasses' }

function callout([date, hill, hours], other) {
  const fields = `date=${`'${date}'`}, hill='${hill}', hours=${hours}`
  return [
    IMPORT,
    isDataclass('Callout'),
    { code: `first = Callout(${s(date)}, ${s(hill)}, ${hours})` },
    {
      code: '(first.date, first.hill, first.hours)',
      want: tuple(date, hill, hours),
      hint: 'The callout does not keep the values it was made with in date, hill and hours. The values of Callout(...) fill the fields in the order they are written in the class: date, hill, hours.'
    },
    {
      code: 'repr(first)',
      want: `Callout(${fields})`,
      hint: 'repr(first) is not the one @dataclass writes from the fields, Callout(date=..., hill=..., hours=...). Leave __repr__ to the dataclass.'
    },
    {
      code: `first == Callout(${s(date)}, ${s(hill)}, ${hours})`,
      want: true,
      hint: 'Two callouts with the same date, hill and hours are not equal. @dataclass writes an __eq__ that compares the fields: leave it to the dataclass.'
    },
    {
      code: `first == Callout(${s(date)}, ${s(hill)}, ${hours + 1})`,
      want: false,
      hint: 'Two callouts with different hours are equal.'
    },
    {
      code: `Callout(hours=${other[2]}, hill=${s(other[1])}, date=${s(other[0])}).hill`,
      want: other[1],
      hint: 'A callout made with the names of its fields does not keep the hill it was given.'
    }
  ]
}

function search(area, other, [thirdArea, thirdTeams, thirdHours]) {
  return [
    IMPORT,
    isDataclass('Search'),
    { code: `first = Search(${s(area)})` },
    {
      code: '(first.area, first.teams, first.hours)',
      want: tuple(area, [], 0),
      hint: (v) =>
        v?.['@tuple']?.[1] === null
          ? 'A search made without teams has None for teams. The task asks for a new empty list for each search.'
          : 'A search made with only its area does not have that area, an empty list of teams and 0 hours.'
    },
    { code: `second = Search(${s(other)})` },
    { code: 'first.teams.append("Alpha")' },
    {
      code: 'second.teams',
      want: [],
      hint: (v) =>
        Array.isArray(v) && v.includes('Alpha')
          ? 'A team added to one search shows up in another: every search made without teams shares one list. A dataclass makes a new list for each object only when the field asks for one with field(...): the lesson shows how.'
          : 'The second search\'s teams are not an empty list after Check added a team to the first.'
    },
    { code: `third = Search(${s(thirdArea)}, ${s(thirdTeams)}, ${thirdHours})` },
    {
      code: '(third.area, third.teams, third.hours)',
      want: tuple(thirdArea, thirdTeams, thirdHours),
      hint: 'A search made with all three values does not keep them in area, teams and hours. The values fill the fields in the order they are written in the class: area, teams, hours.'
    },
    {
      code: 'repr(first)',
      want: `Search(area='${area}', teams=['Alpha'], hours=0)`,
      hint: 'repr(first) is not the one @dataclass writes from the fields. Leave __repr__ to the dataclass.'
    }
  ]
}

function grid([east, north], [byEast, byNorth]) {
  const moved = tuple(east + byEast, north + byNorth)
  return [
    IMPORT,
    isDataclass('GridRef'),
    { code: `base = GridRef(${east}, ${north})` },
    {
      code: '(base.easting, base.northing)',
      want: tuple(east, north),
      hint: 'The grid reference does not keep the easting and northing it was made with, in that order.'
    },
    {
      code: 'base.easting = 9999',
      raises: {
        type: 'FrozenInstanceError',
        swallowed:
          'base.easting = 9999 went through, and the grid reference of the base changed. The task asks that a GridRef cannot be changed once it is made: frozen=True in the round brackets of @dataclass does that.',
        wrongType: 'Changing a field of a frozen dataclass stops with FrozenInstanceError, and here it stops with another error.'
      }
    },
    {
      code: '(base.easting, base.northing)',
      want: tuple(east, north),
      hint: 'The grid reference changed, though changing it stopped with an error.'
    },
    { code: `new = base.moved(${byEast}, ${byNorth})` },
    {
      code: 'type(new).__name__',
      want: 'GridRef',
      hint: (v) =>
        v === 'NoneType'
          ? 'moved gives back None. The task asks it to give back a new GridRef, with return.'
          : `moved gives back a ${v === 'tuple' ? 'tuple' : v}, and the task asks for a new GridRef.`
    },
    {
      code: '(new.easting, new.northing)',
      want: moved,
      hint: (v) =>
        JSON.stringify(v) === JSON.stringify(tuple(east - byEast, north - byNorth))
          ? 'The new grid reference is that far west and south, not east and north: add the distances, do not take them away.'
          : 'The new grid reference is not that many metres east and north of this one: add east to the easting and north to the northing.'
    },
    {
      code: 'new is base',
      want: false,
      hint: 'moved gives back this same grid reference. The task asks for a new GridRef.'
    },
    {
      code: `base == GridRef(${east}, ${north})`,
      want: true,
      hint: 'The base is no longer equal to a GridRef made with its own easting and northing.'
    }
  ]
}

export const checks = {
  callout(t) {
    return classCases(t, {
      file: FILE,
      task: 1,
      attrs: ATTRS,
      explain: DATACLASS_ERROR,
      names: { Callout: 'class' },
      list: [
        { name: 'A callout record', steps: callout(['02/11/2041', 'Glas Tholl', 6], ['09/01/2042', 'Stob Ruadh', 3]) },
        { name: 'Another callout', steps: callout(['27/12/2041', 'Meikle Pap', 11], ['30/01/2042', 'Creag Bheag', 2]) }
      ]
    })
  },

  search(t) {
    return classCases(t, {
      file: FILE,
      task: 2,
      attrs: ATTRS,
      explain: DATACLASS_ERROR,
      names: { Search: 'class' },
      list: [
        { name: 'Two searches, each with its own teams', steps: search('Glas Tholl', 'Meikle Pap', ['Stob Ruadh', ['Bravo', 'Charlie'], 5]) },
        { name: 'Two more searches', steps: search('Creag Bheag', 'Lochan Wood', ['Black Corrie', ['Delta'], 12]) }
      ]
    })
  },

  grid(t) {
    return classCases(t, {
      file: FILE,
      task: 3,
      attrs: ATTRS,
      methods: ['moved'],
      explain: DATACLASS_ERROR,
      names: { GridRef: 'class' },
      list: [
        { name: 'A grid reference that stays put, and one moved from it', steps: grid([2405, 6120], [150, -40]) },
        { name: 'Another grid reference', steps: grid([3150, 5875], [-250, 300]) }
      ]
    })
  }
}

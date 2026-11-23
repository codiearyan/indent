import { dataCases, fail } from '../../grading.mjs'

const FILE = 'hill_report.py'

const float = (n) => ({ '@float': n })

/**
 * Fails the task once when a function other than the one with the mistake was changed. `keep`
 * maps each function that must stay as it came with the file to its code and to why it is right.
 */
const onlyOne = (fix, keep) => ({
  names: [fix, ...Object.keys(keep)],
  judge(changed) {
    const touched = Object.keys(keep).filter((name) => changed.includes(name))
    if (!touched.length) return null
    const [name] = touched
    return fail(
      `Only the function with the mistake changes`,
      `You changed ${name}. ${keep[name].why} Put ${name} back as it came with the file, then follow the traceback up from where Python stops: the value that arrives there was made by a function further up.`,
      `${name} came with the file as:\n${keep[name].code}`
    )
  }
})

const ADD_HOURS = 'def add_hours(total, hours):\n    return total + hours'
const TOTAL_HOURS =
  'def total_hours(hours_list):\n    total = 0\n    for hours in hours_list:\n        total = add_hours(total, hours)\n    return total'
const WEIGHT_OF = 'def weight_of(weights, kind):\n    return weights[kind]'
const WEIGHTS_OF =
  'def weights_of(weights, kinds):\n    found = []\n    for kind in kinds:\n        found.append(weight_of(weights, kind))\n    return found'
const PARSE = 'def parse_positions(text):\n    return json.loads(text)'

const WHERE_IT_STOPS =
  'That is where Python stops, which is not always where the mistake is. Read the traceback from the bottom up and ask, at each File line, where the value it uses was made'

export const checks = {
  hours(t) {
    const list = [
      ['Three callouts on the hill', ['Black Knowe; 6', 'Garve Edge; 2', 'Black Knowe; 3', 'Black Knowe; 10'], 'Black Knowe', 19],
      ['Spaces in other places', ['Garve Edge;1', 'Lowther Crag; 12 ', 'Garve Edge;  4 '], 'Garve Edge', 5],
      ['One callout on the hill', ['Scarth Fell; 8', 'Cairn Dubh; 11'], 'Cairn Dubh', 11],
      ['No callout on the hill', ['Scarth Fell; 3'], 'Garve Edge', 0]
    ]
    return dataCases(t, {
      file: FILE,
      task: 1,
      fn: 'hill_hours',
      compare: onlyOne('hill_hours', {
        add_hours: { code: ADD_HOURS, why: 'Python stops in add_hours, but add_hours does the right thing: it adds two numbers.' },
        total_hours: { code: TOTAL_HOURS, why: 'total_hours does the right thing: it adds up a list of numbers.' }
      }),
      errors: (e) =>
        e.type === 'TypeError' && /unsupported operand/.test(e.message)
          ? `+ cannot add text to a whole number. ${WHERE_IT_STOPS}: here, where each hours value in the list came from`
          : null,
      typed: 'hill_hours gives back the same number whatever log Check gives it. Add up the hours of the entries it is given.',
      list: list.map(([name, entries, hill, hours]) => ({
        name,
        args: [entries, hill],
        expected: hours,
        hint: (v) =>
          v.type === 'float'
            ? 'hill_hours gives back a decimal number. The hours in the log are whole numbers, and so is their total.'
            : v.type === 'str'
              ? 'hill_hours gives back text. The hours have to be numbers before they can be added up.'
              : 'hill_hours does not give back the hours of that hill added up.'
      }))
    })
  },

  pack(t) {
    const weights = { rope: 4.5, helmet: 0.5, 'bivvy bag': 1.25, stretcher: 9.5 }
    const list = [
      ['A space after each comma', 'rope, helmet, bivvy bag', 6.25],
      ['Spaces before a comma too', 'helmet , rope,bivvy bag', 6.25],
      ['The same kind twice', 'rope,  rope', 9],
      ['One kind on the list', 'stretcher', 9.5]
    ]
    return dataCases(t, {
      file: FILE,
      task: 2,
      fn: 'pack_weight',
      compare: onlyOne('pack_weight', {
        weight_of: { code: WEIGHT_OF, why: 'Python stops in weight_of, but weight_of does the right thing: it looks a kind up in the weights.' },
        weights_of: { code: WEIGHTS_OF, why: 'weights_of does the right thing: it looks up each kind it is given.' }
      }),
      errors: (e) =>
        e.type === 'KeyError'
          ? `the weights have no kind ${e.message}. Look at that key closely, spaces included. ${WHERE_IT_STOPS}: here, where each kind came from`
          : null,
      typed: 'pack_weight gives back the same weight whatever packing list Check gives it. Add up the weights of the kinds on the list it is given.',
      list: list.map(([name, packing, kg]) => ({
        name,
        args: [weights, packing],
        expected: float(kg),
        hint: 'pack_weight does not give back the weight of the kinds on the list, added up.'
      }))
    })
  },

  positions(t) {
    const list = [
      ['Two teams over several lines', 'teams tonight.json', '{\n  "GOLF SIX": [151, 688],\n  "KILO FIVE": [190, 702]\n}\n', { 'GOLF SIX': [151, 688], 'KILO FIVE': [190, 702] }],
      ['A place name outside ASCII', 'glen.json', '{"LIMA THREE": [233, 671], "Beinn Ìme": [244, 709]}', { 'LIMA THREE': [233, 671], 'Beinn Ìme': [244, 709] }],
      ['No team heard yet', 'empty.json', '{}', {}]
    ]
    return dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'team_positions',
      text: true,
      compare: onlyOne('team_positions', {
        parse_positions: { code: PARSE, why: 'The last line of yours in the traceback is in parse_positions, but parse_positions does the right thing: it turns JSON text into Python values.' }
      }),
      errors: (e) =>
        e.type === 'JSONDecodeError'
          ? `what json.loads was given is not JSON. The File lines below your last one are inside the json module, not yours, and the line and column in the message count in the text json.loads was given, not in your file. ${WHERE_IT_STOPS}: here, what was given to json.loads`
          : null,
      typed: 'team_positions gives back the same dictionary whatever file Check gives it. Give back what the file at the path it is given holds.',
      list: list.map(([name, path, text, want]) => ({
        name,
        args: [path],
        files: { [path]: text },
        expected: want,
        hint: 'team_positions does not give back what the file holds, as a dictionary.'
      }))
    })
  }
}

import { cases } from '../../grading.mjs'

const FILE = 'src/labels.js'

const parcel = (customerName, city, orderNumber) => ({ customerName, city, orderNumber })
const ruth = parcel('   Ruth Okafor  ', 'Porto', 77)
const sam = parcel('Sam Lee', 'oslo', 2001)
const ana = parcel(' Ana Silva', 'bergen', 5)

const spacesHint = (hint) => (v) =>
  v?.type === 'string' && v.value !== v.value.trim()
    ? `cleanName still has spaces at its ${v.value.trimStart() === v.value ? 'end' : 'start'}. Look for a string method that tidies both ends at once.`
    : hint

/** Says which of the two jobs, cutting or capitals, cityCode gets wrong. */
const cityHint = (code) => (v) => {
  if (v?.type !== 'string') return 'cityCode should be text: three letters cut from city.'
  if (v.value.length !== 3) {
    return 'cityCode should be exactly three letters from the start of city. Look at where slice starts and stops: counting starts at 0, and the stop position is not included.'
  }
  if (v.value.toUpperCase() === code) return 'cityCode has the right letters, but the code is always in capitals.'
  return 'cityCode should be the first three letters of city, in capitals. Look at where slice starts: counting starts at 0.'
}

export const checks = {
  name(t) {
    return cases(t, {
      file: FILE,
      name: 'cleanName',
      task: 'Task 1',
      typed:
        'Check changed the name and cleanName stayed the same. Build it on customerName, not on text you typed.',
      list: [
        {
          name: 'Removes spaces at both ends',
          given: ruth,
          expected: 'Ruth Okafor',
          hint: spacesHint('cleanName should have no spaces before the first letter or after the last one.')
        },
        {
          name: 'Keeps a name that is already tidy',
          given: sam,
          expected: 'Sam Lee',
          hint: 'A name with no extra spaces should come out as it went in, with the space between the two words kept.'
        },
        {
          name: 'Removes spaces at the start only',
          given: ana,
          expected: 'Ana Silva',
          hint: spacesHint('This name has spaces at the start only. Look for a string method that tidies both ends at once.')
        }
      ]
    })
  },

  city(t) {
    return cases(t, {
      file: FILE,
      name: 'cityCode',
      task: 'Task 2',
      typed: 'Check changed the city and cityCode stayed the same. Build it on city, not on text you typed.',
      list: [
        {
          name: 'Takes the first three letters',
          given: ruth,
          expected: 'POR',
          hint: cityHint('POR')
        },
        {
          name: 'Makes small letters capital',
          given: sam,
          expected: 'OSL',
          hint: cityHint('OSL')
        },
        {
          name: 'Works for a longer name',
          given: ana,
          expected: 'BER',
          hint: cityHint('BER')
        }
      ]
    })
  },

  line(t) {
    return cases(t, {
      file: FILE,
      name: 'labelLine',
      task: 'Task 3',
      after: {
        names: ['cleanName', 'cityCode'],
        task: 'Tasks 1 and 2',
        build: (g, v) => `Order ${g.orderNumber} for ${v.cleanName}, ${v.cityCode}`
      },
      typed:
        'Check changed the parcel and labelLine stayed the same. Build it from orderNumber, cleanName and cityCode, not from text you typed.',
      list: [
        {
          name: 'Writes the label for another parcel',
          given: ruth,
          expected: 'Order 77 for Ruth Okafor, POR',
          hint: 'Compare your line with the example in the task, word by word: the spaces, the comma and the capitals all count.'
        },
        {
          name: 'Works for a parcel with a tidy name',
          given: sam,
          expected: 'Order 2001 for Sam Lee, OSL',
          hint: 'Compare your line with the example in the task, word by word. Each changing part comes from orderNumber, cleanName or cityCode.'
        }
      ]
    })
  },

  length(t) {
    const line = (p) =>
      `Order ${p.orderNumber} for ${p.customerName.trim()}, ${p.city.slice(0, 3).toUpperCase()}`
    return cases(t, {
      file: FILE,
      name: 'labelLength',
      task: 'Task 4',
      after: { names: ['labelLine'], task: 'Task 3', build: (g, v) => v.labelLine?.length },
      typed:
        'Check changed the parcel and labelLength stayed the same. Build it on labelLine, not on a number you counted.',
      list: [
        {
          name: 'Counts the characters of the label',
          given: ruth,
          expected: line(ruth).length,
          hint: 'labelLength should be how many characters labelLine has, spaces included. Count them on labelLine itself.'
        },
        {
          name: 'Follows a shorter label',
          given: sam,
          expected: line(sam).length,
          hint: 'labelLength should be how many characters labelLine has, spaces included. Count them on labelLine itself.'
        }
      ]
    })
  }
}

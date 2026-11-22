import { cases } from '../../grading.mjs'

const FILE = 'src/labels.js'

const parcel = (customerName, city, orderNumber) => ({ customerName, city, orderNumber })
const ruth = parcel('   Ruth Okafor  ', 'Porto', 77)
const sam = parcel('Sam Lee', 'oslo', 2001)
const ana = parcel(' Ana Silva', 'bergen', 5)

export const checks = {
  name(t) {
    return cases(t, {
      file: FILE,
      name: 'cleanName',
      task: 'Task 1',
      list: [
        {
          name: 'Removes spaces at both ends',
          given: ruth,
          expected: 'Ruth Okafor',
          hint: 'cleanName should have no spaces before the first letter or after the last one. Build it on customerName, not on text you typed.'
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
          hint: 'This name has spaces at the start only. Look for a string method that tidies both ends at once.'
        }
      ]
    })
  },

  city(t) {
    return cases(t, {
      file: FILE,
      name: 'cityCode',
      task: 'Task 2',
      list: [
        {
          name: 'Takes the first three letters',
          given: ruth,
          expected: 'POR',
          hint: 'cityCode should be exactly three letters from the start of city. Remember that counting starts at 0.'
        },
        {
          name: 'Makes small letters capital',
          given: sam,
          expected: 'OSL',
          hint: 'The city here is typed in small letters, and the code is always in capitals.'
        },
        {
          name: 'Works for a longer name',
          given: ana,
          expected: 'BER',
          hint: 'Check tried another city and cityCode did not follow. Build it on city, not on text you typed.'
        }
      ]
    })
  },

  line(t) {
    return cases(t, {
      file: FILE,
      name: 'labelLine',
      task: 'Task 3',
      list: [
        {
          name: 'Writes the label for another parcel',
          given: ruth,
          expected: 'Order 77 for Ruth Okafor, POR',
          hint: 'Compare your line with the example in the task, word by word: the spaces, the comma and the capitals all count. Tasks 1 and 2 must pass first.'
        },
        {
          name: 'Works for a parcel with a tidy name',
          given: sam,
          expected: 'Order 2001 for Sam Lee, OSL',
          hint: 'Check tried another parcel and labelLine did not follow. Build it from orderNumber, cleanName and cityCode.'
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
      list: [
        {
          name: 'Counts the characters of the label',
          given: ruth,
          expected: line(ruth).length,
          hint: 'labelLength should be how many characters labelLine has, spaces included. Count them on labelLine itself, and make sure Task 3 passes.'
        },
        {
          name: 'Follows a shorter label',
          given: sam,
          expected: line(sam).length,
          hint: 'Check tried another parcel and labelLength did not follow. Build it on labelLine, not on a number you counted.'
        }
      ]
    })
  }
}

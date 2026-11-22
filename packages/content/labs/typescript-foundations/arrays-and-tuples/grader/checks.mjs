import { call, judge } from '../../grading.mjs'

const FILE = 'src/picking.ts'

export const checks = {
  parcel(t) {
    const hint =
      'parcelGrams should give the sum of every weight in the list, and 0 for an empty list.'
    return judge(t, {
      file: FILE,
      task: 1,
      results: ['parcelGrams'],
      uses: 'grader/types/parcel.uses.ts',
      misuse: 'grader/types/parcel.misuse.ts',
      cases: [
        call('parcelGrams', [[500, 125, 125]], 750, hint),
        call('parcelGrams', [[50]], 50, hint),
        call('parcelGrams', [[]], 0, hint)
      ]
    })
  },

  picklist(t) {
    return judge(t, {
      file: FILE,
      task: 2,
      annotated: ['pickList'],
      uses: 'grader/types/picklist.uses.ts',
      misuse: 'grader/types/picklist.misuse.ts',
      messages: {
        uses: "Check's own code reads the picking list as a list of order ids and adds one more, and the compiler refuses it. Look at the type you gave pickList: what goes in it?"
      },
      cases: [
        {
          name: 'The picking list holds the two orders',
          read: 'pickList',
          expected: ['OK-1042', 'OK-1043'],
          setup: 'pickList, after the lines of Task 2',
          hint: 'pickList should start empty and end up holding the two order ids the lines under it add. Change only its type.'
        }
      ]
    })
  },

  code(t) {
    return judge(t, {
      file: FILE,
      task: 3,
      results: ['splitCode'],
      uses: 'grader/types/code.uses.ts',
      misuse: 'grader/types/code.misuse.ts',
      messages: {
        misuse:
          "Check's own code reads a third part of the result, or uses a part as the wrong type, and the compiler lets it through. A list type says every item could be either; the result type should say exactly what comes first and what comes second."
      },
      cases: [
        call(
          'splitCode',
          ['MK-50'],
          ['MK', 50],
          'splitCode should give the blend code as text and the grams as a number. Leave its body as the starter wrote it.'
        ),
        call(
          'splitCode',
          ['SL-125'],
          ['SL', 125],
          'splitCode should give the two parts of any code.'
        )
      ]
    })
  },

  lines(t) {
    return judge(t, {
      file: FILE,
      task: 4,
      results: ['orderLines'],
      uses: 'grader/types/lines.uses.ts',
      misuse: 'grader/types/lines.misuse.ts',
      cases: [
        call(
          'orderLines',
          [
            [
              ['Smoky Lapsang', 3],
              ['Hearth Assam', 1]
            ]
          ],
          ['Smoky Lapsang x3', 'Hearth Assam x1'],
          "orderLines should give one text per line, in the same order: the blend, a space, an x and the number of tins, like 'Hearth Assam x2'."
        ),
        call('orderLines', [[]], [], 'An order with no lines should give an empty list.')
      ]
    })
  }
}

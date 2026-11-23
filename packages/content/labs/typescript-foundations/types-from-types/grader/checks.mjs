import { call, judge } from '../../grading.mjs'

const FILE = 'src/catalogue.ts'
const RUNNER = 'grader/run.mjs'
// Tin with a property added and a size more, written in place of the shared Tin.
const GROWN =
  'export type Tin = { id: string; blend: string; size: 50 | 125 | 250 | 500; pence: number; stock: number; origin: string }'

const keemun = { id: 'T-31', blend: 'Morning Keemun', size: 250, pence: 990, stock: 3 }
const nilgiri = { id: 'T-32', blend: 'Nilgiri Frost', size: 50, pence: 450, stock: 0 }
const yunnan = { id: 'T-33', blend: 'Golden Yunnan', size: 250, pence: 1080, stock: 11 }

export const checks = {
  fields(t) {
    return judge(t, {
      file: FILE,
      task: 1,
      declared: { TinField: 'type' },
      named: [['cell', 'TinField']],
      uses: 'grader/types/fields.uses.ts',
      misuse: 'grader/types/fields.misuse.ts',
      messages: {
        uses: "Check's own code uses the name of every property of a tin as a TinField, and the compiler refuses one of them. TinField should allow each property name of Tin, and nothing else. The output says which use.",
        misuse:
          "Check's own code uses a name that is not a property of a tin as a TinField, and the compiler lets it through. TinField should be only the names of the properties of Tin. The output says which use."
      },
      follow: {
        type: 'Tin',
        with: GROWN,
        uses: 'grader/types/fields.follow.uses.ts',
        name: 'TinField follows Tin',
        message:
          'Check added a property, origin, to Tin in its own copy, and TinField did not take in its name. Names written out by hand stay as they were when Tin changes. Make TinField from Tin itself, as the lesson shows.'
      },
      cases: [
        call(
          'cell',
          [keemun, 'blend'],
          'Morning Keemun',
          'cell should give the property it is asked for, as text. Leave its body as it is.'
        ),
        call(
          'cell',
          [nilgiri, 'stock'],
          '0',
          'cell should give the property it is asked for, as text. Leave its body as it is.'
        )
      ]
    })
  },

  size(t) {
    return judge(t, {
      file: FILE,
      task: 2,
      declared: { Size: 'type' },
      named: [['tinsOfSize', 'Size']],
      uses: 'grader/types/size.uses.ts',
      misuse: 'grader/types/size.misuse.ts',
      messages: {
        uses: "Check's own code uses every size a tin can have as a Size, and the compiler refuses one of them. Size should be the type of the size property of Tin. The output says which use.",
        misuse:
          "Check's own code uses a size the shop does not sell, or text, as a Size, and the compiler lets it through. Size should allow only the sizes a tin can have, not every number. The output says which use."
      },
      follow: {
        type: 'Tin',
        with: GROWN,
        uses: 'grader/types/size.follow.uses.ts',
        misuse: 'grader/types/size.follow.misuse.ts',
        name: 'Size follows Tin',
        message:
          'Check gave Tin a new size, 500, in its own copy, and Size did not take it in. Sizes written out by hand stay as they were when Tin changes. Read Size from the size property of Tin, as the lesson shows.'
      },
      cases: [
        call(
          'tinsOfSize',
          [[keemun, nilgiri, yunnan], 250],
          [keemun, yunnan],
          'tinsOfSize should give every tin of that size, in the same order. Leave its body as it is.'
        ),
        call(
          'tinsOfSize',
          [[keemun, nilgiri], 125],
          [],
          'tinsOfSize should give an empty list when no tin has that size. Leave its body as it is.'
        )
      ]
    })
  },

  update(t) {
    return judge(t, {
      file: FILE,
      task: 3,
      runner: RUNNER,
      results: ['updateTin'],
      uses: 'grader/types/update.uses.ts',
      misuse: 'grader/types/update.misuse.ts',
      messages: {
        uses: "Check's own code passes updateTin changes to one property, to a few, and to none, and the compiler refuses one of them. Every property of the changes should be there to use, and none required. The output says which use.",
        misuse:
          "Check's own code passes updateTin a change of the wrong type, or to a property a tin does not have, and the compiler lets it through. Each property of the changes should keep the type it has in Tin. The output says which use."
      },
      follow: {
        type: 'Tin',
        with: GROWN,
        uses: 'grader/types/update.follow.uses.ts',
        misuse: 'grader/types/update.follow.misuse.ts',
        name: 'The changes follow Tin',
        message:
          'Check added a property, origin, and a size, 500, to Tin in its own copy, and the changes updateTin takes did not follow. Properties written out again by hand stay as they were when Tin changes. Make the type of the changes from Tin, as the lesson shows.'
      },
      cases: [
        call(
          'updateTin',
          [keemun, { stock: 7 }],
          { ...keemun, stock: 7 },
          'updateTin should give back the tin with the changes made, and every other property as it was.'
        ),
        call(
          'updateTin',
          [nilgiri, { pence: 500, blend: 'Nilgiri Dawn' }],
          { ...nilgiri, pence: 500, blend: 'Nilgiri Dawn' },
          'updateTin should make every change it is given, and keep the rest.'
        ),
        call(
          'updateTin',
          [yunnan, {}],
          yunnan,
          'With no changes, updateTin should give back a tin just like the one it was given.'
        ),
        {
          name: 'updateTin leaves the tin it was given as it was',
          call: 'updateTin',
          run: 'keepsTin',
          setup:
            'const tin = { ..., pence: 990, stock: 8 }\nupdateTin(tin, { stock: 1, pence: 500 })\ntin is as it was',
          expected: true,
          hint: 'updateTin changed the tin it was given. Make a new object with the properties of the tin and then the changes, and give that back.'
        }
      ]
    })
  },

  parts(t) {
    return judge(t, {
      file: FILE,
      task: 4,
      declared: { NewTin: 'type', ShelfLabel: 'type' },
      uses: 'grader/types/parts.uses.ts',
      misuse: 'grader/types/parts.misuse.ts',
      messages: {
        uses: "Check's own code makes a NewTin with everything but an id, and a ShelfLabel with the blend and the size, and the compiler refuses one of them. The output says which use.",
        misuse:
          "Check's own code makes a NewTin or a ShelfLabel with a property too many or too few, and the compiler lets it through. A NewTin is a tin without its id; a ShelfLabel is only the blend and the size. The output says which use."
      },
      follow: {
        type: 'Tin',
        with: GROWN,
        uses: 'grader/types/parts.follow.uses.ts',
        misuse: 'grader/types/parts.follow.misuse.ts',
        name: 'NewTin and ShelfLabel follow Tin',
        message:
          'Check added a property, origin, and a size, 500, to Tin in its own copy, and NewTin or ShelfLabel did not follow. A NewTin is everything a tin has but its id, so it gains origin too; a ShelfLabel is only the blend and the size, so it does not. A copy written out by hand stays as it was. Make each from Tin, naming the properties that decide it, as the lesson shows.'
      },
      cases: [
        call(
          'withId',
          [{ blend: 'Golden Yunnan', size: 250, pence: 1080, stock: 11 }, 'T-33'],
          yunnan,
          'withId should give back the tin with the id it was given. Leave its body as it is.'
        ),
        call(
          'shelfLabel',
          [{ blend: 'Nilgiri Frost', size: 50 }],
          'Nilgiri Frost, 50 g',
          'shelfLabel should give the blend and the size. Leave its body as it is.'
        )
      ]
    })
  }
}

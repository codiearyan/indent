import { call, judge } from '../../grading.mjs'

const FILE = 'src/stock.ts'
const RUNNER = 'grader/run.mjs'
const SWITCH = (setting) =>
  `With ${setting} on, as this task asks, the compiler refuses a line of it. Have it on in tsconfig.json, run npm run types, read the message for that line, and fix what it points at.`

const yunnan = { blend: 'Golden Yunnan', tins: 4, reorderAt: 6 }
const keemun = { blend: 'Morning Keemun', tins: 15, reorderAt: 5 }
const nilgiri = { blend: 'Nilgiri Frost', tins: 0, reorderAt: 3 }

const unreadable = '{tins: 4}'
let reason = ''
try {
  JSON.parse(unreadable)
} catch (error) {
  reason = error.message
}

export const checks = {
  params(t) {
    return judge(t, {
      file: FILE,
      task: 1,
      flags: ['--strict', 'false', '--noImplicitAny'],
      tsconfig: { need: ['noImplicitAny'] },
      uses: 'grader/types/params.uses.ts',
      misuse: 'grader/types/params.misuse.ts',
      messages: {
        compiles: SWITCH('noImplicitAny'),
        misuse:
          "Check's own code passes tinsToOrder or shelfLine a value of the wrong type, and the compiler lets it through. Every parameter should have a type that says what it takes. The output says which use."
      },
      cases: [
        call(
          'tinsToOrder',
          [yunnan, 10],
          6,
          'tinsToOrder should give the tins it takes to bring the shelf up to the number given. Read what the compiler finds in its body.'
        ),
        call(
          'tinsToOrder',
          [keemun, 10],
          0,
          'For a shelf that already has enough tins, tinsToOrder should give 0. Leave the rest of its body as it is.'
        ),
        call(
          'shelfLine',
          [nilgiri],
          'Nilgiri Frost: 0 tins',
          'shelfLine should give the line as before. Leave its body as it is.'
        )
      ]
    })
  },

  nulls(t) {
    return judge(t, {
      file: FILE,
      task: 2,
      runner: RUNNER,
      nonNull: true,
      flags: ['--strict', 'false', '--noImplicitAny', '--strictNullChecks'],
      tsconfig: { need: ['strictNullChecks'] },
      uses: 'grader/types/nulls.uses.ts',
      misuse: 'grader/types/nulls.misuse.ts',
      messages: {
        compiles: SWITCH('strictNullChecks'),
        uses: "Check's own code uses what tinsOf gives as a number, and what reorderNote gives as text or undefined, and the compiler refuses it. The output says which use.",
        misuse:
          "Check's own code uses what reorderNote gives as text that is always there, and the compiler lets it through. For a full shelf there is no note, so its result type should say it may be undefined."
      },
      cases: [
        call(
          'tinsOf',
          [[yunnan, keemun], 'Morning Keemun'],
          15,
          'tinsOf should give the tins on the shelf of that blend.'
        ),
        call(
          'tinsOf',
          [[yunnan, keemun], 'Smoky Lapsang'],
          0,
          'For a blend that has no shelf, tinsOf should give 0.'
        ),
        call('tinsOf', [[], 'Golden Yunnan'], 0, 'With no shelves at all, tinsOf should give 0.'),
        call(
          'reorderNote',
          [nilgiri],
          'Reorder Nilgiri Frost',
          'reorderNote should give the note for a low shelf as before.'
        ),
        {
          name: 'reorderNote gives undefined for a full shelf',
          call: 'reorderNote',
          run: 'fullHasNoNote',
          setup: "reorderNote({ blend: 'Golden Yunnan', tins: 9, reorderAt: 6 }) === undefined",
          expected: true,
          hint: 'For a shelf that is not low, reorderNote should keep giving undefined, as before. Say so in its result type instead of changing what it gives.'
        }
      ]
    })
  },

  strict(t) {
    return judge(t, {
      file: FILE,
      task: 3,
      flags: ['--strict'],
      tsconfig: {
        need: ['strict'],
        messages: {
          strict:
            'Task 3 asks for strict on in tsconfig.json, with every check it turns on. The output names those that are off: one switched off on its own line stays off even with strict on.'
        }
      },
      uses: 'grader/types/strict.uses.ts',
      messages: {
        compiles: SWITCH('strict'),
        real: 'Keep error unknown, and find out what it is before you read from it, as the lesson shows.'
      },
      cases: [
        call(
          'countLine',
          ['{"blend":"Golden Yunnan","tins":4}'],
          'Golden Yunnan: 4 tins',
          'countLine should give the line for a count it can read, as before.'
        ),
        call(
          'countLine',
          [unreadable],
          `Could not read the count: ${reason}`,
          'For text it cannot read, countLine should give "Could not read the count: " and the message of the error, without the name of the error in front.'
        )
      ]
    })
  },

  index(t) {
    return judge(t, {
      file: FILE,
      task: 4,
      nonNull: true,
      flags: ['--strict', '--noUncheckedIndexedAccess'],
      tsconfig: {
        need: ['noUncheckedIndexedAccess', 'strictNullChecks'],
        messages: {
          strictNullChecks:
            'noUncheckedIndexedAccess says an item read from a list may be undefined, and only strictNullChecks makes the compiler check that. Keep it on, with strict.'
        }
      },
      uses: 'grader/types/index.uses.ts',
      messages: { compiles: SWITCH('noUncheckedIndexedAccess') },
      cases: [
        call(
          'firstToReorder',
          [[keemun, yunnan, nilgiri]],
          'Golden Yunnan',
          'firstToReorder should give the blend of the first shelf below its reorder point.'
        ),
        call(
          'firstToReorder',
          [[keemun]],
          'Nothing to reorder',
          "When no shelf is low, firstToReorder should give 'Nothing to reorder'."
        ),
        call(
          'firstToReorder',
          [[]],
          'Nothing to reorder',
          "With no shelves at all, firstToReorder should give 'Nothing to reorder'."
        )
      ]
    })
  }
}

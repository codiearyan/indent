import {
  VALUES_IN_SQL,
  broken,
  clear,
  sandbox,
  same,
  showSql,
  written
} from '../../shared/checks-lib.mjs'

const show = (value) => JSON.stringify(value, null, 2)
const describeColumns = (columns) =>
  columns.length === 0
    ? 'The workshops table does not exist.'
    : `The workshops table has these columns:\n${columns
        .map(
          (c) => `  ${c.name} ${c.type}${c.notnull ? ' NOT NULL' : ''}${c.pk ? ' PRIMARY KEY' : ''}`
        )
        .join('\n')}`

const FIELDS = ['title', 'day', 'seats', 'priceCents']
const TYPES = { id: 'INTEGER', title: 'TEXT', day: 'TEXT', seats: 'INTEGER', priceCents: 'INTEGER' }

// The checks' own workshops for seeding, so the studio's list cannot be typed in as the answer.
const toSeed = [
  { id: 31, title: "Potter's wheel taster", day: 'sun', seats: 4, priceCents: 1850 },
  { id: 34, title: 'Burnished bowls', day: 'wed', seats: 8, priceCents: 4425 },
  { id: 40, title: 'Smoke-fired vessels', day: 'sat', seats: 6, priceCents: 5175 }
]

function judgeTables(report) {
  if (report.error) {
    return broken('createTables runs', report.error).map((d) => ({
      ...d,
      message: /Not implemented/.test(report.error)
        ? d.message
        : 'createTables threw on an empty database. Read the error: SQLite says which word of the SQL it could not read.',
      output: `${report.error}\n\n${showSql(report.sql)}`
    }))
  }
  const cols = report.workshops
  const byName = Object.fromEntries(cols.map((c) => [c.name, c]))
  const output = describeColumns(cols)
  const missing = Object.keys(TYPES).filter((name) => !byName[name])
  const wrongType = FIELDS.filter(
    (name) => byName[name] && byName[name].type.toUpperCase() !== TYPES[name]
  )
  const nullable = FIELDS.filter((name) => byName[name] && !byName[name].notnull)
  return [
    {
      name: 'The workshops table has its five columns',
      passed: missing.length === 0 && wrongType.length === 0,
      message:
        missing.length > 0
          ? `The workshops table is missing ${missing.join(', ')}. The column names are the same as the workshop fields, spelled the same way.`
          : `Check the type of ${wrongType.join(', ')}: whole numbers are INTEGER and text is TEXT.`,
      output
    },
    {
      name: 'id is the INTEGER PRIMARY KEY',
      passed:
        byName.id?.pk === 1 &&
        byName.id.type.toUpperCase() === 'INTEGER' &&
        Number.isInteger(report.autoIdRow?.id),
      message: !byName.id?.pk
        ? 'id should be the primary key of the table: the one column that tells rows apart.'
        : 'A row added without an id got no id of its own. Only a column declared exactly INTEGER PRIMARY KEY picks the next id for itself; INT or NUMBER do not.',
      output: `${output}\n\nA row added without an id got: ${show(report.autoIdRow ?? report.autoId)}`
    },
    {
      name: 'No field can be left empty',
      passed: nullable.length === 0 && Boolean(report.noTitle?.error),
      message: `A workshop without ${nullable.join(', ') || 'a title'} should be refused by the database. Mark each of those columns NOT NULL.`,
      output: `${output}\n\nAdding a workshop with no title: ${report.noTitle?.error ?? 'it was saved'}`
    },
    {
      name: 'Running it again keeps the table and its rows',
      passed: Boolean(report.again?.ok) && report.after.workshops === report.before.workshops,
      message: report.again?.error
        ? 'The second call threw because the table is already there. Every start of the server runs createTables, so it should make the table only when it does not exist yet.'
        : 'After a second call the rows were gone. createTables should leave a table that already exists, and its rows, as they are.',
      output: report.again?.error
        ? `The second call threw: ${report.again.error}`
        : `Rows before the second call: ${report.before.workshops}, after: ${report.after.workshops}`
    }
  ]
}

function judgeSeed(report) {
  const [first, second, third] = report.steps
  const unwritten = report.steps.find((s) => /Not implemented/.test(s.error ?? ''))
  if (unwritten) return broken('seedWorkshops is written', unwritten.error)
  const call = 'seedWorkshops(db, workshops) with workshops of the check'
  const found = written(
    report.sql,
    toSeed.flatMap((w) => [w.title, w.priceCents])
  )
  return [
    {
      name: 'An empty table gets every workshop, ids and all',
      passed: !first.error && same(first.rows, toSeed),
      message: first.error
        ? 'seedWorkshops threw on an empty table. Read the error.'
        : 'After the first call the table should hold exactly the workshops it was given, each with its own id and fields.',
      output: `${call}\n${first.error ? `threw ${first.error}\n` : ''}The table then held:\n${show(first.rows)}`
    },
    {
      name: 'A second call adds nothing',
      passed:
        !first.error && !second.error && first.rows.length > 0 && same(second.rows, first.rows),
      message: second.error
        ? 'The second call threw. Read the error: the table already holds those ids, so they cannot be added again.'
        : 'After a second call the table should hold the same rows as after the first. Look at how many rows the table has before you add any.',
      output: `${second.error ? `threw ${second.error}\n` : ''}After the first call:\n${show(first.rows)}\n\nAfter the second:\n${show(second.rows)}`
    },
    {
      name: 'A workshop someone removed stays removed',
      passed:
        !third.error &&
        third.removed !== undefined &&
        same(
          third.rows,
          second.rows.filter((w) => w.id !== third.removed)
        ),
      message: third.error
        ? 'The call after a removal threw. Read the error.'
        : 'The check removed one workshop and called seedWorkshops again, as a restart would, and the table changed. A table that has any rows at all is left as it is.',
      output: `${third.error ? `threw ${third.error}\n` : ''}The check removed the workshop with id ${third.removed}. The table then held:\n${show(third.rows)}`
    },
    {
      name: 'The values travel apart from the SQL',
      passed: !found,
      message: found ? VALUES_IN_SQL(found) : undefined,
      output: found ? `The SQL with the value in it:\n${found.text}` : showSql(report.sql)
    }
  ]
}

export const checks = {
  async table(t) {
    const dir = await sandbox(t)
    const r = await t.call(dir, '.grader/harness.mjs', 'tables')
    if (!r.ok) return broken('createTables runs', r.error)
    return clear(judgeTables(r.value))
  },

  async seed(t) {
    const dir = await sandbox(t)
    const r = await t.call(dir, '.grader/harness.mjs', 'seed', [toSeed])
    if (!r.ok) return broken('seedWorkshops runs', r.error)
    return clear(judgeSeed(r.value))
  },

  async open(t) {
    const dir = await sandbox(t)
    const [tables, seeded] = await Promise.all([
      t.call(dir, '.grader/harness.mjs', 'tables'),
      t.call(dir, '.grader/harness.mjs', 'seed', [toSeed])
    ])
    const earlier = [
      ...(tables.ok ? judgeTables(tables.value) : broken('createTables runs', tables.error)),
      ...(seeded.ok ? judgeSeed(seeded.value) : broken('seedWorkshops runs', seeded.error))
    ].filter((d) => !d.passed)
    if (earlier.length > 0) {
      return [
        {
          name: 'createTables and seedWorkshops are right',
          passed: false,
          message: `openDatabase builds on the first two tasks, so it is judged once they pass. Not right yet: ${earlier.map((d) => d.name).join('; ')}.`,
          output: earlier.map((d) => `${d.name}\n${d.output ?? ''}`).join('\n\n')
        }
      ]
    }
    const rel = '.grader/tmp/studio/kilnworth.db'
    const r = await t.call(dir, '.grader/harness.mjs', 'open', [rel])
    if (!r.ok) return broken('openDatabase runs', r.error)
    const report = r.value
    if (report.error) {
      const noFolder = /unable to open database file/i.test(report.error)
      return [
        {
          name: 'openDatabase opens a file in a folder that is not there yet',
          passed: false,
          message: /Not implemented/.test(report.error)
            ? `openDatabase still throws 'Not implemented'. Replace that line with your code.`
            : noFolder
              ? 'SQLite could not open the file. It makes a file that is missing, but not a folder that is missing, so make the folder of the path openDatabase is given before you open it. Making a folder that is already there should not fail either.'
              : 'openDatabase threw. Read the error.',
          output: `openDatabase('${rel}')\nthrew ${report.error}`
        }
      ]
    }
    if (report.notDb) {
      return [
        {
          name: 'openDatabase returns the database',
          passed: false,
          message:
            'openDatabase should return the open database, so the rest of the app can use it.',
          output: `openDatabase('${rel}')\nreturned ${report.notDb}`
        }
      ]
    }
    const changed = report.changed
    return clear([
      {
        name: 'The file is made where it was asked for',
        passed: report.exists,
        message:
          'No file was made at the path openDatabase was given. Open the file it is passed, not a path of your own.',
        output: `openDatabase('${rel}')\nfile there afterwards: ${report.exists ? 'yes' : 'no'}`
      },
      {
        name: "A new file starts with the studio's workshops",
        passed: same(report.first, report.expected),
        message:
          "A brand new database should hold the tables and the studio's workshops from src/workshops.js.",
        output: `The workshops table held:\n${show(report.first)}`
      },
      {
        name: 'Opening it again keeps every change',
        passed: !report.secondError && same(report.second, changed),
        message: report.secondError
          ? 'Opening the same file a second time threw. Read the error.'
          : 'The check removed one workshop and changed another, closed the file and opened it again, as a restart would. Those changes should still be there.',
        output: report.secondError
          ? `The second openDatabase threw ${report.secondError}`
          : `Before closing:\n${show(changed)}\n\nAfter opening again:\n${show(report.second)}`
      }
    ])
  }
}

import type { Intro } from './types'

// scripts/build-packs.mjs imports this file straight into Node, so it imports only types.

/** The most characters each text may have, so nothing wraps badly in a station 184px wide. */
export const INTRO_LIMITS = {
  title: 18,
  say: 36,
  text: 44,
  note: 40,
  file: 18,
  gap: 32,
  task: 22,
  row: 24,
  why: 12,
  /** The ticket's label, a space and one ending. */
  ticket: 24,
  caption: 90
}

export const INTRO_FRAMES = 5

const STATION_KEYS = [
  'title',
  'say',
  'text',
  'rows',
  'mark',
  'note',
  'mine',
  'file',
  'gap',
  'tasks'
]
const BODIES = ['say', 'text', 'rows']
const MINE_ONLY = ['file', 'gap', 'tasks']

type Json = Record<string, unknown>

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== ''

function tooLong(value: string, most: number, what: string): string[] {
  return value.length > most ? [`${what} is ${value.length} characters; the most is ${most}`] : []
}

/** Problems of a text that must be there. */
function textProblems(value: unknown, most: number, what: string): string[] {
  return isText(value) ? tooLong(value, most, what) : [`${what} must be text`]
}

function rowsProblems(station: Json, where: string): string[] {
  const rows = station.rows
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 3) {
    return [`${where}: rows must be a list of 1 to 3 rows`]
  }
  const problems: string[] = []
  rows.forEach((row, i) => {
    const what = `${where}: row ${i + 1}`
    if (!Array.isArray(row) || row.length < 1 || row.length > 2 || !row.every(isText)) {
      problems.push(`${what} must be a list of one or two cells of text`)
    } else problems.push(...tooLong(row.join(' '), INTRO_LIMITS.row, what))
  })
  const mark = station.mark
  if (mark !== undefined && !(Number.isInteger(mark) && rows[mark as number] !== undefined)) {
    problems.push(`${where}: mark must be the number of a row, counted from 0`)
  }
  return problems
}

function stationProblems(station: unknown, i: number): string[] {
  const where = `station ${i + 1}`
  if (!isObject(station)) return [`${where} must be an object with a title`]
  const problems = textProblems(station.title, INTRO_LIMITS.title, `${where}: title`)
  for (const key of Object.keys(station)) {
    if (!STATION_KEYS.includes(key)) problems.push(`${where}: "${key}" is not a key of a station`)
  }
  if (station.mine !== undefined && typeof station.mine !== 'boolean') {
    problems.push(`${where}: mine must be true or false`)
  }
  const bodies = BODIES.filter((key) => station[key] !== undefined)

  if (station.mine === true) {
    for (const key of [...bodies, 'mark', 'note'].filter((key) => station[key] !== undefined)) {
      problems.push(`${where}: the learner’s station has tasks, not ${key}`)
    }
    const tasks = station.tasks
    if (!Array.isArray(tasks) || tasks.length < 1 || tasks.length > 4) {
      problems.push(`${where}: the learner’s station needs 1 to 4 tasks`)
    } else {
      tasks.forEach((task, t) =>
        problems.push(...textProblems(task, INTRO_LIMITS.task, `${where}: task ${t + 1}`))
      )
    }
    if (station.gap === undefined) problems.push(`${where}: the learner’s station needs gap`)
    else problems.push(...textProblems(station.gap, INTRO_LIMITS.gap, `${where}: gap`))
    if (station.file !== undefined) {
      problems.push(...textProblems(station.file, INTRO_LIMITS.file, `${where}: file`))
    }
    return problems
  }

  for (const key of MINE_ONLY.filter((key) => station[key] !== undefined)) {
    problems.push(`${where}: only the learner’s station has ${key}`)
  }
  if (bodies.length !== 1) problems.push(`${where} needs one of say, text or rows`)
  if (station.say !== undefined) {
    problems.push(...textProblems(station.say, INTRO_LIMITS.say, `${where}: say`))
  }
  if (station.text !== undefined) {
    problems.push(...textProblems(station.text, INTRO_LIMITS.text, `${where}: text`))
  }
  if (station.rows !== undefined) problems.push(...rowsProblems(station, where))
  else if (station.mark !== undefined) problems.push(`${where}: only a station with rows has mark`)
  if (station.note !== undefined) {
    problems.push(...textProblems(station.note, INTRO_LIMITS.note, `${where}: note`))
  }
  return problems
}

function ticketProblems(ticket: unknown): string[] {
  if (!isObject(ticket)) return ['needs a ticket with label, wrong, why and right']
  const problems: string[] = []
  for (const key of ['label', 'wrong', 'why', 'right']) {
    if (!isText(ticket[key])) problems.push(`the ticket needs ${key}`)
  }
  if (problems.length) return problems
  const { label, wrong, why, right } = ticket as Record<string, string>
  return [
    ...tooLong(`${label} ${wrong}`, INTRO_LIMITS.ticket, 'the ticket’s label with wrong'),
    ...tooLong(`${label} ${right}`, INTRO_LIMITS.ticket, 'the ticket’s label with right'),
    ...tooLong(why, INTRO_LIMITS.why, 'the ticket’s why')
  ]
}

function emDashes(value: unknown, where: string): string[] {
  if (typeof value === 'string') return value.includes('—') ? [`${where} has an em dash`] : []
  if (Array.isArray(value)) return value.flatMap((item) => emDashes(item, where))
  if (isObject(value)) {
    return Object.entries(value).flatMap(([key, item]) => emDashes(item, `${where} ${key}`.trim()))
  }
  return []
}

function introProblems(data: unknown): string[] {
  if (!isObject(data)) return ['must be an object with stations, a ticket and captions']
  const problems: string[] = []

  const stations = Array.isArray(data.stations) ? data.stations : []
  if (stations.length < 3 || stations.length > 4) problems.push('needs 3 or 4 stations')
  stations.forEach((station, i) => problems.push(...stationProblems(station, i)))
  const mine = stations.filter((station) => isObject(station) && station.mine === true)
  if (mine.length !== 1) {
    problems.push('exactly one station must be the learner’s, with mine: true')
  } else if (stations[0] === mine[0]) {
    problems.push('the learner’s station cannot be first; someone has to ask before it')
  }

  problems.push(...ticketProblems(data.ticket))

  const captions = Array.isArray(data.captions) ? data.captions : []
  if (captions.length !== INTRO_FRAMES) {
    problems.push(`needs ${INTRO_FRAMES} captions, one per frame`)
  }
  captions.forEach((caption, i) =>
    problems.push(...textProblems(caption, INTRO_LIMITS.caption, `caption ${i + 1}`))
  )

  return [...problems, ...emDashes(data, '')]
}

/**
 * Parses and checks an intro.json. Each problem names the file and says what is wrong. The caps
 * on length are part of the format: the stage is narrow and the text must fit without a scroll.
 */
export function checkIntro(
  text: string,
  file: string
): { intro: Intro | null; problems: string[] } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (error) {
    return { intro: null, problems: [`${file} is not valid JSON: ${(error as Error).message}`] }
  }
  const problems = introProblems(data).map((problem) => `${file}: ${problem}`)
  return { intro: problems.length ? null : (data as Intro), problems }
}

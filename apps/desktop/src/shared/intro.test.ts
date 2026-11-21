import { describe, expect, it } from 'vitest'
import { checkIntro } from './intro'

const FILE = 'shop/orders/intro.json'

const valid = {
  stations: [
    { title: 'Rider', say: 'Where is order PL-2041?', note: 'At the delivery desk.' },
    { title: 'Pip', text: 'A chat model.', note: 'It only knows what it is told.' },
    {
      title: 'Your code',
      file: 'assistant.ts',
      mine: true,
      gap: 'Nothing connects them yet',
      tasks: ['Describe the lookup', 'Read the request', 'Send the result back']
    },
    {
      title: 'Order list',
      rows: [
        ['PL-2040', 'delivered'],
        ['PL-2041', 'out for delivery'],
        ['PL-2042', 'packing']
      ],
      mark: 1
    }
  ],
  ticket: { label: 'PL-2041', wrong: 'delivered?', why: 'A guess', right: 'out for delivery' },
  captions: [
    'Riders keep asking where an order is.',
    'Pip cannot read the order list, so it guesses.',
    'You write the piece in between, in three tasks.',
    'Now your code looks the order up.',
    'Same question, real answer.'
  ]
}

type Json = Record<string, unknown>

const check = (data: unknown): string[] => checkIntro(JSON.stringify(data), FILE).problems

/** The valid intro with one station replaced or changed. */
const withStation = (index: number, change: Json | null): Json => ({
  ...valid,
  stations: valid.stations.flatMap((station, i) =>
    i !== index ? [station] : change ? [{ ...station, ...change }] : []
  )
})

describe('checkIntro', () => {
  it('accepts a valid intro and returns it', () => {
    const result = checkIntro(JSON.stringify(valid), FILE)
    expect(result.problems).toEqual([])
    expect(result.intro?.stations).toHaveLength(4)
  })

  it('names the file in every problem', () => {
    expect(check({})[0]).toMatch(/^shop\/orders\/intro\.json: /)
  })

  it('reports text that is not JSON', () => {
    const result = checkIntro('{', FILE)
    expect(result.intro).toBeNull()
    expect(result.problems[0]).toContain('is not valid JSON')
  })

  it('wants three or four stations', () => {
    expect(check({ ...valid, stations: valid.stations.slice(1, 3) })).toContainEqual(
      expect.stringContaining('3 or 4 stations')
    )
  })

  it('wants exactly one station that is the learner’s', () => {
    expect(check(withStation(1, { mine: true }))).toContainEqual(
      expect.stringContaining('exactly one station')
    )
    expect(check(withStation(2, null))).toContainEqual(
      expect.stringContaining('exactly one station')
    )
  })

  it('does not let the learner’s station come first', () => {
    const stations = [valid.stations[2], valid.stations[0], valid.stations[3]]
    expect(check({ ...valid, stations })).toContainEqual(expect.stringContaining('cannot be first'))
  })

  it('wants one body on a station', () => {
    expect(check(withStation(0, { text: 'Also this.' }))).toContainEqual(
      expect.stringContaining('one of say, text or rows')
    )
    expect(check(withStation(1, { text: undefined }))).toContainEqual(
      expect.stringContaining('one of say, text or rows')
    )
  })

  it('keeps tasks, gap and file to the learner’s station', () => {
    expect(check(withStation(1, { gap: 'A hole' }))).toContainEqual(
      expect.stringContaining('only the learner’s station has gap')
    )
    expect(check(withStation(2, { tasks: [] }))).toContainEqual(
      expect.stringContaining('1 to 4 tasks')
    )
    expect(check(withStation(2, { tasks: ['a', 'b', 'c', 'd', 'e'] }))).toContainEqual(
      expect.stringContaining('1 to 4 tasks')
    )
    expect(check(withStation(2, { gap: undefined }))).toContainEqual(
      expect.stringContaining('needs gap')
    )
  })

  it('checks rows and the row that lights up', () => {
    expect(check(withStation(3, { mark: 3 }))).toContainEqual(
      expect.stringContaining('mark must be the number of a row')
    )
    expect(check(withStation(3, { rows: [['a', 'b', 'c']] }))).toContainEqual(
      expect.stringContaining('one or two cells')
    )
    expect(check(withStation(3, { rows: [['a'], ['b'], ['c'], ['d']], mark: 0 }))).toContainEqual(
      expect.stringContaining('1 to 3 rows')
    )
    expect(check(withStation(1, { mark: 0 }))).toContainEqual(
      expect.stringContaining('only a station with rows has mark')
    )
  })

  it('refuses a key it does not know', () => {
    expect(check(withStation(0, { titel: 'Rider' }))).toContainEqual(
      expect.stringContaining('"titel"')
    )
  })

  it('caps the length of every text', () => {
    expect(check(withStation(0, { title: 'A very long station title' }))).toContainEqual(
      expect.stringContaining('title is 25 characters; the most is 18')
    )
    const ticket = { ...valid.ticket, right: 'out for delivery at 14:30' }
    expect(check({ ...valid, ticket })).toContainEqual(expect.stringContaining('the most is 24'))
    const captions = [...valid.captions.slice(0, 4), 'x'.repeat(91)]
    expect(check({ ...valid, captions })).toContainEqual(expect.stringContaining('the most is 90'))
  })

  it('wants a whole ticket', () => {
    expect(check({ ...valid, ticket: { label: 'PL-2041' } })).toContainEqual(
      expect.stringContaining('ticket needs wrong')
    )
  })

  it('wants five captions', () => {
    expect(check({ ...valid, captions: valid.captions.slice(0, 4) })).toContainEqual(
      expect.stringContaining('5 captions')
    )
  })

  it('refuses an em dash', () => {
    const captions = ['Riders ask — a lot.', ...valid.captions.slice(1)]
    expect(check({ ...valid, captions })).toContainEqual(expect.stringContaining('em dash'))
  })
})

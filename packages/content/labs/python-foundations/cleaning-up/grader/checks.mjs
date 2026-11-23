import { dataCases, tuple } from '../../grading.mjs'

const FILE = 'radio_desk.py'

const HEARD = {
  1: 'BASE: radio check',
  2: 'HOTEL ONE: two walkers, both well',
  3: 'ECHO ONE: on the ridge',
  4: 'LIMA THREE: at the hut',
  6: 'MIKE TWO: leaving Lochan Ùr'
}

// Check's own listen and entry_line, the same as the file's, with what is heard on each channel
// its own.
const DEFINE = `
_HEARD = {${Object.entries(HEARD).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')}}


def listen(radio):
    channel = radio["channel"]
    if channel not in _HEARD:
        raise ValueError(f"channel {channel} cannot be tuned")
    return _HEARD[channel]


def entry_line(entry):
    time, said = entry
    if len(time) != 5 or time[2] != ":":
        raise ValueError(f"the time {time!r} is not written like 21:05")
    return f"{time} {said}\\n"
`

const SWALLOWED = (fn, what) => (v) =>
  `${fn} gave back ${v.repr} when ${what} stopped with ValueError, and the task says that error must reach the caller. An except that does not raise again throws the error away, and so does a return in a finally block.`

const lineOf = ([time, said]) => `${time} ${said}\n`
const entry = (time, said) => tuple(time, said)

export const checks = {
  channel(t) {
    const radio = (channel) => ({ channel, volume: 5 })
    const LEFT = (got) =>
      `After the call, the radio is on channel ${got?.['@dict']?.find(([k]) => k === 'channel')?.[1]}, not the one it was on before. Put the channel back in a finally block: it runs when the try ends well and when it stops with an error.`
    return dataCases(t, {
      file: FILE,
      task: 1,
      fn: 'scan',
      raising: true,
      define: DEFINE,
      list: [
        { name: 'Two channels', args: [radio(4), [1, 2]], expected: [HEARD[1], HEARD[2]], afterHint: LEFT },
        { name: 'Back to where it started', args: [radio(2), [6, 3, 2]], expected: [HEARD[6], HEARD[3], HEARD[2]], afterHint: LEFT },
        { name: 'No channels', args: [radio(1), []], expected: [], afterHint: LEFT },
        {
          name: 'A channel it cannot tune to, in the middle',
          args: [radio(1), [2, 9, 4]],
          afterHint: LEFT,
          raises: { type: 'ValueError', swallowed: SWALLOWED('scan', 'listen') }
        },
        {
          name: 'A channel it cannot tune to, first',
          args: [radio(3), [7]],
          afterHint: LEFT,
          raises: { type: 'ValueError', swallowed: SWALLOWED('scan', 'listen') }
        }
      ].map((c) => ({
        ...c,
        after: { 0: c.args[0] },
        hint: 'scan does not give back what was heard on each channel, in the order of the channels.'
      }))
    })
  },

  close(t) {
    const old = 'Callout log, 2 December\n19:00 KILO FIVE: radio check\n'
    const good = [entry('21:05', 'GOLF SIX: leaving the base'), entry('21:40', 'GOLF SIX: at Lochan Ùr')]
    return dataCases(t, {
      file: FILE,
      task: 2,
      fn: 'write_log',
      raising: true,
      define: DEFINE,
      list: [
        {
          name: 'Every entry written',
          args: ['tonight.txt', good],
          files: { 'tonight.txt': old },
          wrote: { 'tonight.txt': good.map((e) => lineOf(e['@tuple'])).join('') }
        },
        {
          name: 'No entries',
          args: ['empty night.txt', []],
          files: { 'empty night.txt': old },
          wrote: { 'empty night.txt': '' }
        },
        {
          name: 'An entry with a bad time, the file is closed',
          args: ['tonight.txt', [entry('22:10', 'HOTEL ONE: at the stile'), entry('half ten', 'HOTEL ONE: walker found')]],
          files: { 'tonight.txt': old },
          raises: { type: 'ValueError', swallowed: SWALLOWED('write_log', 'entry_line') }
        },
        {
          name: 'A bad time first, the file is closed',
          args: ['night two.txt', [entry('9pm', 'ECHO ONE: leaving')]],
          files: {},
          paths: ['night two.txt'],
          raises: { type: 'ValueError', swallowed: SWALLOWED('write_log', 'entry_line') }
        }
      ]
    })
  },

  whole(t) {
    const old = 'Callout log, 2 December\n19:00 KILO FIVE: radio check\n'
    const good = [entry('21:05', 'GOLF SIX: leaving the base'), entry('21:40', 'GOLF SIX: at Lochan Ùr')]
    const bad = [entry('22:10', 'HOTEL ONE: at the stile'), entry('half ten', 'HOTEL ONE: walker found')]
    const HALF = (rel) => (got) =>
      got !== old
        ? `After the call, ${rel} no longer holds what it held before, and an entry stopped with an error: the file was opened with "w", which empties it, before every line was ready. Work out every line first, then open the file and write them.`
        : null
    return dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'save_log',
      raising: true,
      define: DEFINE,
      list: [
        {
          name: 'Every entry saved over an old log',
          args: ['saved.txt', good],
          files: { 'saved.txt': old },
          wrote: { 'saved.txt': good.map((e) => lineOf(e['@tuple'])).join('') }
        },
        {
          name: 'A new file',
          args: ['night two.txt', good.slice(1)],
          files: {},
          wrote: { 'night two.txt': lineOf(good[1]['@tuple']) }
        },
        {
          name: 'A bad entry leaves the old log as it was',
          args: ['saved.txt', bad],
          files: { 'saved.txt': old },
          wrote: { 'saved.txt': old },
          fileHint: (rel, got) => HALF(rel)(got),
          raises: { type: 'ValueError', swallowed: SWALLOWED('save_log', 'entry_line') }
        },
        {
          name: 'A bad entry makes no new file',
          args: ['night three.txt', bad],
          files: {},
          wrote: { 'night three.txt': null },
          raises: { type: 'ValueError', swallowed: SWALLOWED('save_log', 'entry_line') }
        }
      ]
    })
  }
}

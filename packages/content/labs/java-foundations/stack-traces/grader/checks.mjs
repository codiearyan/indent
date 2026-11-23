import { readFile } from 'node:fs/promises'
import { attempt, codeOnly, fail, outcomeCases, pass, sameCode, tasks } from '../../grading.mjs'

const FILE = 'EveningReport.java'

/** The whole of method `name` in `text`, from its first line to its closing brace, or null. */
function method(text, name) {
  const code = codeOnly(text)
  const at = code.search(new RegExp(`\\bstatic\\s+[\\w\\[\\]]+\\s+${name}\\s*\\(`))
  if (at < 0) return null
  const open = code.indexOf('{', at)
  let depth = 0
  for (let i = open; i < code.length; i++) {
    if (code[i] === '{') depth++
    else if (code[i] === '}' && --depth === 0) return text.slice(at, i + 1)
  }
  return null
}

// A line that only prints, such as a debug println left in, does not count as a change.
const quiet = (code) => code.replace(/^[ \t]*System\.out\.print(?:ln|f)?\s*\(.*\);[ \t]*(?:\/\/.*)?$/gm, '')

/** Details for the methods a task says to leave as they are: each must match the starter's. */
async function leftAlone(t, section, n, names, why) {
  const starter = await readFile(t.chapterPath(`starter/${FILE}`), 'utf8')
  const given = starter.replace(/\r\n?/g, '\n').split(new RegExp(`(?=^// Task ${n}\\b)`, 'm'))[1].split(/(?=^\/\/ Task \d)/m)[0]
  return names.map((name) => {
    const was = method(given, name)
    const now = method(section, name)
    if (now !== null && sameCode(was, quiet(now))) return pass(`${name} is as it was`)
    return fail(
      `${name} is as it was`,
      now === null
        ? `Check cannot find ${name} as the starter gave it. Every method of this task stays, and only one of them is wrong. The starter's ${name} is below: put it back.`
        : `${name} is not as the starter gave it. ${why[name]} Put it back as it was (it is below) and mend only the method that is wrong.`,
      `The starter's ${name}:\n${was}`
    )
  })
}

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  tasks: {
    departures: {
      task: 1,
      cases: [
        attempt({
          name: 'The last of four crossings',
          call: 'Departures.last(new int[] { 8, 10, 12, 14 })',
          type: 'String',
          expected: { got: 'Crossing 4 leaves at 14:00' },
          hint: 'last should give back the line of the day\'s last crossing, numbered as people count.'
        }),
        attempt({
          name: 'The last of seven crossings',
          call: 'Departures.last(new int[] { 6, 8, 10, 13, 16, 20, 22 })',
          type: 'String',
          expected: { got: 'Crossing 7 leaves at 22:00' },
          hint: 'last should give back the line of the day\'s last crossing, numbered as people count.'
        }),
        attempt({
          name: 'A day of one crossing',
          call: 'Departures.last(new int[] { 12 })',
          type: 'String',
          expected: { got: 'Crossing 1 leaves at 12:00' },
          hint: 'On a day with one crossing, that crossing is the last.'
        }),
        attempt({
          name: 'line still reads a position counting from 0',
          call: 'Departures.line(new int[] { 7, 9, 11 }, 0)',
          type: 'String',
          expected: { got: 'Crossing 1 leaves at 7:00' },
          hint: 'line, handed position 0, should give back the first crossing, as its comment says.'
        })
      ],
      judge: async (runs, ctx) => [
        ...(await leftAlone(ctx.t, ctx.section, 1, ['line', 'clock'], {
          line: 'The trace passes through line, and line does what its comment says with the position it is handed.',
          clock: 'The trace starts in clock, because that is where Java stopped, and clock does what its comment says with the position it is handed.'
        })),
        ...outcomeCases({ file: FILE })(runs, ctx)
      ]
    },

    skippers: {
      task: 2,
      cases: [
        attempt({
          name: 'Every boat sailing gets its skipper',
          call: 'Skippers.notice(new String[] { new String("Curlew"), new String("Plover") }, new String[] { "Plover", "Dunlin", "Curlew" }, new String[] { "Iona", "Lachlan", "Catriona" })',
          show: 'String got = Skippers.notice(\n    new String[] { "Curlew", "Plover" },\n    new String[] { "Plover", "Dunlin", "Curlew" },\n    new String[] { "Iona", "Lachlan", "Catriona" });',
          type: 'String',
          expected: { got: 'Curlew: C.\nPlover: I.\n' },
          hint: 'notice should give back a line for every boat sailing, each with the first letter of the skipper the rota gives that boat.'
        }),
        attempt({
          name: 'skipperOf finds every boat on the rota',
          call: 'Skippers.skipperOf("Dunlin", new String[] { "Whimbrel", "Dunlin" }, new String[] { "Seumas", "Ruaridh" })',
          type: 'String',
          expected: { got: 'Ruaridh' },
          hint: 'skipperOf should give back the skipper at the same position as the boat on the rota, wherever on the rota the boat is.'
        }),
        attempt({
          name: 'A rota of one boat',
          call: 'Skippers.skipperOf("Scaup", new String[] { "Scaup" }, new String[] { "Catriona" })',
          type: 'String',
          expected: { got: 'Catriona' },
          hint: 'skipperOf should give back the skipper at the same position as the boat on the rota, wherever on the rota the boat is.'
        }),
        attempt({
          name: 'The first boat on the rota',
          call: 'Skippers.notice(new String[] { "Whimbrel" }, new String[] { "Whimbrel", "Scaup" }, new String[] { "Lachlan", "Iona" })',
          type: 'String',
          expected: { got: 'Whimbrel: L.\n' },
          hint: 'notice should give back a line for every boat sailing, each with the first letter of the skipper the rota gives that boat.'
        })
      ],
      judge: async (runs, ctx) => [
        ...(await leftAlone(ctx.t, ctx.section, 2, ['notice', 'line', 'initial'], {
          notice: 'notice does what its comment says with the skipper it is handed.',
          line: 'The trace passes through line, and line does what its comment says with the skipper it is handed.',
          initial: 'The trace starts in initial, because that is where Java stopped, and initial does what its comment says with the name it is handed.'
        })),
        ...outcomeCases({ file: FILE })(runs, ctx)
      ]
    },

    takings: {
      task: 3,
      cases: [
        attempt({
          name: 'Adds up the seats of every line',
          call: 'Takings.total(new String[] { "10:00,Curlew,4", "12:00,Plover,11", "14:00,Curlew,3" })',
          type: 'int',
          expected: { got: 18 },
          hint: 'total should give back the seats of every ledger line added up.'
        }),
        attempt({
          name: 'The seats of one line',
          call: 'Takings.seatsOn("15:00,Dunlin,7")',
          type: 'int',
          expected: { got: 7 },
          hint: 'seatsOn should give back the seats a ledger line says were sold: the line holds the time, the boat and the seats.'
        }),
        attempt({
          name: 'A line with no seats sold',
          call: 'Takings.seatsOn("17:00,Scaup,0")',
          type: 'int',
          expected: { got: 0 },
          hint: 'seatsOn should give back the seats a ledger line says were sold: the line holds the time, the boat and the seats.'
        })
      ],
      judge: async (runs, ctx) => [
        ...(await leftAlone(ctx.t, ctx.section, 3, ['total'], {
          total: 'total does what its comment says with the seats each line gives it.'
        })),
        ...outcomeCases({
          file: FILE,
          mistakes: [
            {
              when: (r) => /^\d{1,2}$/.test(r.values.got?.value ?? '') && r.case.expected.got !== Number(r.values.got.value) && /\b(?:10|12|14|15|17)\b/.test(r.values.got.value),
              hint: 'seatsOn gives back a number from the line, but not the seats: read the line\'s parts in order, the time, the boat and the seats.'
            }
          ]
        })(runs, ctx)
      ]
    }
  }
})

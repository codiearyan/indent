import { calledIn, earlier, loose, play, readSource, show } from '../../waiting-grading.mjs'

const FILE = 'src/later.js'

const ran = (r, ms) => r.log.findIndex((l) => l === `the ${show(ms)} ms timer ran`)
const printed = (r) => r.log.filter((l) => l.startsWith('printed: ')).map((l) => l.slice(9))
const handedCall = (r) => r.log.some((l) => l.startsWith('setTimeout was handed'))

export const checks = {
  remind(t) {
    return play(t, {
      file: FILE,
      fn: 'remindLater',
      cases: [
        ['Ask Theo about the market stall', 300],
        ['Call the courier', 50],
        ['Wax order goes out today', 1200]
      ].map(([note, ms]) => ({
        name: `Reminds about "${note}" ${ms} ms later`,
        run: 'remind',
        args: [note, ms],
        setup: `remindLater(${show(note)}, ${ms}), then Check moves its clock on until every timer has run`,
        judge(r) {
          const want = `Reminder: ${note}`
          const lines = printed(r)
          if (handedCall(r)) {
            return 'setTimeout was handed the answer of a call, not a function. With round brackets right there, console.log runs at once and setTimeout gets what it gives back, undefined. Hand setTimeout a function that prints, and setTimeout calls it later.'
          }
          if (r.timers.length === 0) {
            return lines.length
              ? 'remindLater printed right away and set no timer. The reminder is for ms milliseconds from now: hand the printing to setTimeout.'
              : 'remindLater set no timer and printed nothing. It hands setTimeout a function that prints the reminder, and the number of milliseconds to wait.'
          }
          if (r.timers.length > 1) return 'remindLater set more than one timer. One timer is enough for one reminder.'
          if (r.timers[0].ms !== show(ms)) {
            return `The timer was set for ${r.timers[0].ms} ms. The task asks for the number of milliseconds remindLater is given, in ms.`
          }
          const at = ran(r, ms)
          if (r.log.slice(0, at).some((l) => l.startsWith('printed: '))) {
            return 'remindLater printed before its timer ran. Only the function you hand setTimeout prints: everything outside it runs right away.'
          }
          if (r.thrown.length) return 'The function the timer ran stopped with an error. Read the error in the list below.'
          if (!lines.length) return 'The timer ran, but nothing was printed. The function you hand setTimeout prints the reminder.'
          if (lines.length > 1) return 'The timer printed more than one line. It prints the reminder once.'
          if (lines[0] === want) return undefined
          if (loose(lines[0]) === loose(want)) {
            return 'Close. Compare the printed line letter by letter with the task: Reminder, a colon, a space, then the note.'
          }
          return 'The timer printed something other than the reminder. It prints Reminder, a colon, a space and the note remindLater was given.'
        }
      }))
    })
  },

  stock(t) {
    return play(t, {
      file: FILE,
      fn: 'stockLine',
      cases: [
        ['Moss', 7],
        ['Sea salt', 12],
        ['Fig', 0]
      ].map(([name, count]) => ({
        name: `Passes on the line for ${name}`,
        run: 'stock',
        args: [name, { [name]: count }],
        setup: `stockLine(${show(name)}, done), and the stock room counts ${count}`,
        judge: (r) => judgeStock(r, name, count)
      }))
    })
  },

  async two(t) {
    const text = await readSource(t, FILE)
    const details = await play(t, {
      file: FILE,
      fn: 'twoLines',
      cases: [
        ['Moss', 'Birch', { Moss: 3, Birch: 11 }],
        ['Pear', 'Plum', { Pear: 0, Plum: 5 }]
      ].map(([first, second, counts]) => ({
        name: `Gets ${first}, then ${second}`,
        run: 'two',
        args: [first, second, counts],
        setup: `twoLines(${show(first)}, ${show(second)}, done), and the stock room counts ${counts[first]} ${first} and ${counts[second]} ${second}`,
        judge(r) {
          const asked = r.calls.filter((c) => c.name === 'askStockRoom')
          if (asked.length === 0) return 'twoLines never asked the stock room. Ask for the first candle, through stockLine or askStockRoom.'
          if (asked.length > 2) return 'twoLines asked the stock room more than twice. Two candles need two questions.'
          if (asked[0].args[0] !== show(first)) return 'The first question to the stock room was not about the candle in first. Ask about first, then second.'
          if (asked.length === 1) {
            return 'twoLines asked about the first candle and never about the second. Ask about the second once the first line has arrived: inside the function that gets it.'
          }
          if (asked[1].startedAfter === 0) {
            return 'twoLines asked about both candles at once, before the first count arrived. The task asks for the second only once the first line is there: ask for it inside the function that gets the first line.'
          }
          if (asked[1].args[0] !== show(second)) return 'The second question to the stock room was not about the candle in second.'
          if (r.thrown.length) return 'A function that ran with a count stopped with an error. Read the error in the list below.'
          const want = show([`${first}: ${counts[first]} in stock`, `${second}: ${counts[second]} in stock`])
          if (r.done.length === 0) return 'done was never called. Once both lines are there, call done with a list of the two.'
          if (r.done.length > 1) return 'done was called more than once. Call it once, when both lines are there, with a list of the two.'
          if (r.done[0].afterAnswers < 2) return 'done was called before both counts had arrived. Call it from where the second line arrives.'
          const got = r.done[0].args[0]
          if (got === want) return undefined
          if (!got || !got.startsWith('[')) return `done got ${got ?? 'nothing'}, not a list. Hand it one list, with the two lines in it.`
          if (got === show([`${second}: ${counts[second]} in stock`, `${first}: ${counts[first]} in stock`])) {
            return 'The two lines are the wrong way round. The line for first comes first in the list.'
          }
          return 'done got a list, but not of the two lines the task describes. Each is the name, a colon, a space, the count and in stock, as stockLine makes them.'
        }
      }))
    })
    if (details.length === 1 || !calledIn(text, 'twoLines', 'stockLine')) return details
    const before = await checks.stock(t)
    if (before.every((d) => d.passed)) return details
    return details.map((d) => (d.passed ? d : { ...d, message: earlier('twoLines', 'stockLine').message }))
  },

  hold(t) {
    const cases = [
      {
        name: 'Sends a parcel once its time is up',
        args: [[['P-31', 200]], []],
        setup: "holdParcel('P-31', 200, send), and nobody keeps it back",
        judge: (r) =>
          gaveFunction(r) ??
          timing(r) ??
          (r.sent.length === 0
            ? 'The timer ran, but send was never called. The function you hand setTimeout calls send with the id.'
            : r.sent.length > 1
              ? 'send was called more than once for one parcel.'
              : r.sent[0][0] !== show('P-31')
                ? `send got ${r.sent[0][0] ?? 'nothing'}. It gets the id of the parcel.`
                : undefined)
      },
      {
        name: 'Keeps a parcel back',
        args: [[['P-32', 500]], ['P-32']],
        setup: "keepBack = holdParcel('P-32', 500, send), then keepBack() right away",
        judge: (r) =>
          gaveFunction(r) ??
          (r.thrown.length
            ? 'Calling the function holdParcel gave back stopped with an error. Read the error in the list below.'
            : r.sent.length
              ? 'send still ran after the parcel was kept back. The function holdParcel gives back must stop the timer, so the function you handed setTimeout never runs.'
              : undefined)
      },
      {
        name: 'Keeping one parcel back leaves the other on its way',
        args: [
          [
            ['P-41', 100],
            ['P-42', 300]
          ],
          ['P-41']
        ],
        setup: "holdParcel('P-41', 100, send) and holdParcel('P-42', 300, send), then the function for P-41 is called right away",
        judge: (r) => {
          const ids = r.sent.map((s) => s[0])
          if (gaveFunction(r)) return gaveFunction(r)
          if (ids.includes(show('P-41')) && !ids.includes(show('P-42'))) {
            return 'Keeping back P-41 stopped P-42 instead. Each call of holdParcel needs its own timer, kept inside that call, so each function it gives back stops its own timer.'
          }
          if (ids.includes(show('P-41'))) return 'P-41 was still sent after it was kept back.'
          if (!ids.includes(show('P-42'))) return 'P-42 was never sent, though nobody kept it back.'
          return undefined
        }
      }
    ]
    return play(t, {
      file: FILE,
      fn: 'holdParcel',
      cases: cases.map((c) => ({ ...c, run: 'hold' }))
    })
  }
}

function judgeStock(r, name, count) {
  const want = `${name}: ${count} in stock`
  const asked = r.calls.filter((c) => c.name === 'askStockRoom')
  if (asked.length === 0) return 'stockLine never asked the stock room. Call askStockRoom with the name and a function for the count.'
  if (asked.length > 1) return 'stockLine asked the stock room more than once. One question is enough.'
  if (asked[0].args[0] !== show(name)) return `stockLine asked the stock room about ${asked[0].args[0]}. Ask about the name stockLine is given.`
  const early = r.done.find((d) => d.afterAnswers === 0)
  if (early) {
    return `stockLine called done before the stock room answered${/undefined/.test(early.args[0] ?? '') ? ', so the count in the line was still undefined' : ''}. The line after askStockRoom runs right away; only the function you hand askStockRoom runs once the count is there. Call done from inside it.`
  }
  if (r.log.some((l) => l.startsWith('askStockRoom had no function'))) {
    return 'askStockRoom was not handed a function, so the count had nowhere to go. Hand it a function that takes the count.'
  }
  if (r.thrown.length) return 'The function that got the count stopped with an error. Read the error in the list below.'
  if (r.done.length === 0) {
    return r.log.some((l) => l.startsWith('the function handed to askStockRoom gave back'))
      ? 'The function you hand askStockRoom gives the line back with return, but askStockRoom does nothing with what it gets back, and stockLine has long finished by then. Pass the line on by calling done with it.'
      : 'done was never called. Once the count arrives, call done with the line.'
  }
  if (r.done.length > 1) return 'done was called more than once. Call it once, with the line.'
  const got = r.done[0].args[0]
  if (got === show(want)) return undefined
  if (got === show(count)) return 'done got the count itself. It gets the whole line: the name, a colon, a space, the count and in stock.'
  if (typeof got === 'string' && got.startsWith("'") && loose(got) === loose(want)) {
    return 'Close. Compare the line letter by letter with the task: capital letters, spaces and the colon count.'
  }
  return 'done got something other than the line the task describes: the name, a colon, a space, the count and in stock.'
}

function gaveFunction(r) {
  const bad = r.gaveBack.find((g) => g !== 'function')
  if (bad === undefined) return undefined
  if (/^Timeout /.test(bad)) {
    return 'holdParcel gave back the timer itself, what setTimeout gives back. Give back a function that keeps the parcel back when it is called.'
  }
  return `holdParcel gave back ${bad}, not a function. It gives back a function that keeps the parcel back when it is called.`
}

function timing(r) {
  if (handedCall(r)) {
    return 'setTimeout was handed the answer of a call, not a function. With round brackets right there, send runs at once and setTimeout gets what it gives back. Hand setTimeout a function that calls send.'
  }
  if (r.timers.length === 0) return 'holdParcel set no timer. It hands setTimeout a function that sends the parcel, and the number of milliseconds to wait.'
  if (r.timers[0].ms !== show(200)) return `The timer was set for ${r.timers[0].ms} ms. The task asks for the number of milliseconds holdParcel is given.`
  const at = ran(r, 200)
  if (r.log.slice(0, at).some((l) => l.startsWith('send was called'))) {
    return 'send was called before the timer ran. Only the function you hand setTimeout calls send.'
  }
  return undefined
}

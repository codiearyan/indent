import { aKind, callCases, cases, fail, outputCases, partCode, pass } from '../../grading.mjs'

const FILE = 'pager.py'

const AILSA =
  'def callout_page(hill, crew, meet_at="the base", priority="urgent"): return f"{priority.upper()}: {crew} crew to {hill}, meet at {meet_at}"'

const text = (value) => ({ type: 'str', value })
const number = (value) => ({ type: 'int', value })

const notText = (name, otherwise) => (v) =>
  v && v.type !== 'str' ? `${name} gives back ${aKind(v.type)}, not text.` : otherwise

export const checks = {
  message(t) {
    const list = [
      ['No priority given', ['Exercise at seven'], {}, 'ROUTINE: Exercise at seven'],
      [
        'A priority given in order',
        ['Lost dog near Cluny Road'],
        {},
        'URGENT: Lost dog near Cluny Road',
        'urgent'
      ],
      ['A priority given by name', ['Radio test at noon'], { priority: 'test' }, 'TEST: Radio test at noon'],
      ['Another message without one', ['Kit night on Friday'], {}, 'ROUTINE: Kit night on Friday']
    ]
    return callCases(t, {
      file: FILE,
      task: 1,
      fn: 'pager_message',
      typed:
        'pager_message gives back the same message whatever Check gives it. Build it from its parameters, text and priority.',
      mistakes: [
        {
          value: (c) => `ROUTINE: ${c.args[0]}`,
          hint: 'pager_message says ROUTINE even when Check gives it another priority. Build the message from the parameter priority: it holds the default only when a call gives no priority.'
        }
      ],
      list: list.map(([name, args, kwargs, message, priority]) => ({
        name,
        args: priority ? [...args, priority] : args,
        kwargs,
        expected: text(message),
        hint: notText(
          'pager_message',
          'pager_message does not give back the priority in capitals, a colon, a space and the text. Compare what it gives back with the task, letter by letter.'
        )
      }))
    })
  },

  async exercise(t) {
    const given = (await partCode(t, FILE, 2)).replace(/\s+/g, ' ')
    if (!given.includes(AILSA)) {
      return [
        fail(
          'callout_page is as Ailsa wrote it',
          'callout_page is not as Ailsa wrote it. Put its def line and its return line back as they came with the file: the task is the call, not the function.'
        )
      ]
    }
    const list = [
      ['Another hill and crew', 'Garve Edge', 4],
      ['A bigger exercise', 'Scarth Fell', 9]
    ]
    const details = await cases(t, {
      file: FILE,
      task: 2,
      name: 'exercise_page',
      blocks: true,
      typed:
        'Check changed the exercise and exercise_page stayed the same. Call callout_page with exercise_hill and exercise_crew, not with a hill and a crew typed in.',
      mistakes: [
        {
          value: (g) => `URGENT: ${g.exercise_crew} crew to ${g.exercise_hill}, meet at routine`,
          hint: 'routine ended up as the meeting place, and the page is still urgent. Values without a name fill the parameters in order, so the third one goes to meet_at. Name the parameter the value is for.'
        },
        {
          value: (g) => `ROUTINE: ${g.exercise_hill} crew to ${g.exercise_crew}, meet at the base`,
          hint: 'The hill and the crew are swapped. Values without a name fill the parameters in the order of the def line: hill first, then crew.'
        }
      ],
      list: list.map(([name, hill, crew]) => ({
        name,
        given: { exercise_hill: hill, exercise_crew: crew },
        expected: text(`ROUTINE: ${crew} crew to ${hill}, meet at the base`),
        hint: (v) =>
          !v
            ? 'exercise_page is not made in this case.'
            : v.type !== 'str'
              ? `exercise_page holds ${aKind(v.type)}, not the text callout_page gives back. Store what the call gives back.`
              : 'exercise_page is not the page for this exercise: its hill and crew, the default meeting place, and the priority routine. Read the def line of callout_page again and check what each value in your call goes to.'
      }))
    })
    if (!details.every((d) => d.passed)) return details
    const call = (await partCode(t, FILE, 2))
      .split('\n')
      .filter((line) => !/^\s*(def|return)\b/.test(line))
      .join('\n')
    const typedPlace = /the base|meet_at/.test(call)
    return [
      ...details,
      typedPlace
        ? fail(
            'Leaves the meeting place to its default',
            'exercise_page is right, but the call gives the meeting place itself. Leave meet_at out of the call, so that the default in the def line fills it in, and name the one value that is not in order.'
          )
        : pass('Leaves the meeting place to its default')
    ]
  },

  leader(t) {
    const list = [
      ['Ailsa leads', 'Ailsa', 'Rhona'],
      ['Dougie leads', 'Dougie', 'Iain'],
      ['Iain leads', 'Iain', 'Dougie']
    ]
    return callCases(t, {
      file: FILE,
      task: 3,
      fn: 'leader_line',
      mistakes: [
        {
          value: (c) => `Team leader tonight: ${c.given.leader_on_call}`,
          hint: 'leader_line gives back the leader in leader_on_call at the top of the file, whatever leader it is given. A function can read a name from outside it, which is why the demo looks right. The leader it is given is in its own parameter.'
        }
      ],
      typed:
        'leader_line gives back the same line whatever leader it is given. Build it from its own parameter.',
      list: list.map(([name, leader, onCall]) => ({
        name,
        args: [leader],
        given: { leader_on_call: onCall },
        expected: text(`Team leader tonight: ${leader}`),
        hint: notText(
          'leader_line',
          'leader_line does not give back the line with the leader it is given. Keep the words as they were and change only where the leader comes from.'
        )
      }))
    })
  },

  async ropes(t) {
    const list = [
      ['Some ropes out', 12, 5],
      ['Every rope out', 8, 8],
      ['One rope out', 20, 1]
    ]
    const called = await callCases(t, {
      file: FILE,
      task: 4,
      fn: 'take_ropes',
      typed:
        'take_ropes gives back the same number whatever Check gives it. Work it out from its two parameters, not from the names at the top of the file.',
      list: list.map(([name, store, taken]) => ({
        name,
        args: [store, taken],
        expected: number(store - taken),
        hint: (v) =>
          v.type !== 'int'
            ? `take_ropes gives back ${aKind(v.type)}, not a whole number of ropes.`
            : v.value === taken - store
              ? 'take_ropes gives back the ropes taken out minus the ropes in the store, the wrong way round. Its parameters come in the order the task gives: the ropes in the store first.'
              : 'take_ropes does not give back the ropes in the store with the ropes taken out taken away.'
      }))
    })
    if (!called.every((d) => d.passed)) return called
    const given = { ropes_in_store: 14, ropes_taken: 6 }
    const stored = await cases(t, {
      file: FILE,
      task: 4,
      name: 'ropes_in_store',
      blocks: true,
      mistakes: [
        {
          value: (g) => g.ropes_in_store,
          hint: 'take_ropes gives back the right number, but ropes_in_store is still the count from before. A name changed inside a function never changes the name outside it. Store what take_ropes gives back in ropes_in_store, with =.'
        }
      ],
      list: [
        {
          name: 'ropes_in_store holds the new count',
          given,
          expected: number(8),
          hint: 'ropes_in_store does not hold the ropes left after the lines under # Task 4. Store what take_ropes gives back for ropes_in_store and ropes_taken.'
        }
      ]
    })
    if (!stored.every((d) => d.passed)) return [...called, ...stored]
    const shown = await outputCases(t, {
      file: FILE,
      task: 4,
      list: [{ name: 'The print line shows the new count', given }],
      judge: (out) =>
        out.includes('Ropes in store: 8')
          ? null
          : out.includes('Ropes in store: 14')
            ? 'The print line shows the count from before. Store what take_ropes gives back first, then print.'
            : 'The lines under # Task 4 no longer print the count as the print line below take_ropes did. Keep that line as it was.'
    })
    return [...called, ...stored, ...shown]
  }
}

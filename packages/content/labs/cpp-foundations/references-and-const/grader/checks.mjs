import { judgeCall } from '../../grading.mjs'

const FILE = 'src/drawer.cpp'

const copied = (fn, what, them = false) =>
  `Check's own ${what} did not change. ${fn} changed ${them ? 'copies of them' : 'a copy of it'}: a parameter is a copy of what the caller passed, unless it is a reference.`

export const checks = {
  use(t) {
    const cases = [
      [12, 3],
      [2, 5],
      [4, 4],
      [7, 0]
    ]
    return judgeCall(t, {
      file: FILE,
      task: 1,
      fn: 'useParts',
      returns: 'void',
      params: [
        { name: 'count', what: 'the count in the drawer', type: 'int', after: true },
        { name: 'used', what: 'the parts used', type: 'int', after: true, want: 'int' }
      ],
      cases: cases.map(([inDrawer, used]) => {
        const want = Math.max(0, inDrawer - used)
        return {
          name: `${inDrawer} in the drawer, ${used} used`,
          args: [inDrawer, used],
          expect: { printed: '', args: [want, used] },
          hint: (r) =>
            r.args[1] !== used
              ? "Check's own number of parts used changed. useParts changes only the count in the drawer."
              : r.args[0] === inDrawer && used > 0
                ? copied('useParts', 'count')
                : r.args[0] < 0
                  ? 'The count went below 0. When the drawer has fewer parts than are used, the count becomes 0.'
                  : r.stdout !== ''
                    ? "useParts prints. The task asks it only to change the caller's count."
                    : 'The count afterwards is not the count less the parts used, or 0 when there were too few.'
        }
      })
    })
  },

  split(t) {
    const cases = [135, 59, 240, 61]
    return judgeCall(t, {
      file: FILE,
      task: 2,
      fn: 'splitMinutes',
      returns: 'void',
      params: [
        { name: 'total', what: 'the minutes', type: 'int', after: true, want: 'int' },
        { name: 'hours', what: 'the hours', type: 'int', after: true },
        { name: 'minutes', what: 'the minutes left over', type: 'int', after: true }
      ],
      cases: cases.map((total) => {
        const hours = Math.floor(total / 60)
        const minutes = total % 60
        return {
          name: `${total} minutes`,
          args: [total, 7, 7],
          expect: { printed: '', args: [total, hours, minutes] },
          hint: (r) =>
            r.args[1] === 7 && r.args[2] === 7
              ? copied('splitMinutes', 'hours and minutes', true)
              : r.args[0] !== total
                ? "Check's own total changed. splitMinutes only reads the total."
                : r.args[1] === minutes && r.args[2] === hours
                  ? 'The hours and the minutes are the wrong way round.'
                  : r.args[1] !== hours
                    ? 'The hours afterwards are not the whole hours in the total. 60 minutes make an hour, and whole numbers divided give a whole number.'
                    : 'The minutes afterwards are not the minutes left over after the whole hours. % gives what is left over after a division.'
        }
      })
    })
  },

  label(t) {
    const cases = [
      ['crown', 1],
      ['balance wheel', 30],
      ['hand set', 0]
    ]
    return judgeCall(t, {
      file: FILE,
      task: 3,
      fn: 'drawerLabel',
      returns: 'std::string',
      params: [
        {
          name: 'part',
          what: 'the part',
          type: 'std::string',
          const: true,
          want: 'const std::string&'
        },
        { name: 'count', what: 'the count', type: 'int' }
      ],
      typed:
        'Check called drawerLabel with other parts and got the same label back each time. Build it from what it is given.',
      cases: cases.map(([part, count]) => ({
        name: `The label for ${count} ${part}`,
        args: [part, count],
        expect: { result: `${part} x ${count}`, printed: '' },
        hint: (r) =>
          typeof r.result === 'string' &&
          r.result.replace(/ /g, '') === `${part}x${count}`.replace(/ /g, '')
            ? 'Close. The name and the count are there, but the spaces around the x are not as the task writes them.'
            : typeof r.result === 'string' && r.result.startsWith(part)
              ? 'The label starts with the part, but what follows is not " x " and the count. A number has to become text before it is joined to text.'
              : 'The label is not the part, " x " and the count.'
      }))
    })
  },

  note(t) {
    const cases = [
      ['', 'oiled'],
      ['cleaned', 'new crystal'],
      ['cleaned; oiled', 'hands fitted']
    ]
    return judgeCall(t, {
      file: FILE,
      task: 4,
      fn: 'addNote',
      returns: 'void',
      params: [
        { name: 'log', what: 'the log', type: 'std::string', after: true },
        {
          name: 'note',
          what: 'the note',
          type: 'std::string',
          const: true,
          want: 'const std::string&'
        }
      ],
      cases: cases.map(([log, note]) => {
        const want = log === '' ? note : `${log}; ${note}`
        return {
          name: log === '' ? `"${note}" in an empty log` : `"${note}" after "${log}"`,
          args: [log, note],
          expect: { printed: '', args: [want] },
          hint: (r) =>
            r.args[0] === log
              ? copied('addNote', 'log')
              : log === '' && r.args[0] !== note
                ? 'An empty log becomes just the note, with nothing in front of it.'
                : r.args[0] === `${log}${note}` ||
                    r.args[0] === `${log} ${note}` ||
                    r.args[0] === `${log};${note}`
                  ? 'The note is added, but not with "; " between it and what was there.'
                  : r.args[0] === note
                    ? 'The log lost what was in it. The note goes at the end of what was there.'
                    : 'The log afterwards is not what was there, "; " and the note.'
        }
      })
    })
  }
}

import { dataCases } from '../../grading.mjs'

const FILE = 'radio_words.py'

/** The words for a function that gave back the text it was given, as it was. */
const unchanged = (fn) =>
  `${fn} gives back the text it was given, as it was. A text method never changes the text it is called on: it gives back a new text, and that new text is lost unless you keep it or give it back.`

export const checks = {
  sign(t) {
    const list = [
      ['Spaces at both ends', '  delta four  ', 'DELTA FOUR'],
      ['A line end at the end', 'kilo five\n', 'KILO FIVE'],
      ['A tab, a space and a line end', '\techo one \n', 'ECHO ONE'],
      ['Capitals already, two words', 'GOLF SIX', 'GOLF SIX'],
      ['Mixed capitals, spaces inside kept', ' Mike  Seven', 'MIKE  SEVEN']
    ]
    return dataCases(t, {
      file: FILE,
      task: 1,
      fn: 'call_sign',
      text: true,
      typed:
        'call_sign gives back the same text whatever Check gives it. Work on the call sign it is given.',
      mistakes: [{ value: (c) => c.args[0], hint: unchanged('call_sign') }],
      list: list.map(([name, raw, want]) => ({
        name,
        args: [raw],
        expected: want,
        hint: (v) => {
          const got = String(v.value)
          if (got === raw.toUpperCase()) {
            return /\n|\t/.test(raw) && raw.replace(/\s+$|^\s+/g, '') !== raw.replace(/^ +| +$/g, '')
              ? 'call_sign gives back the call sign in capitals, but the line end or tab at its ends is still there. The method that takes spaces off the ends takes line ends and tabs too when it is given nothing in its brackets.'
              : 'call_sign gives back the call sign in capitals, but with the spaces at its ends still on.'
          }
          if (got === raw.trim()) return 'call_sign takes off the ends, but does not give back capital letters.'
          if (/[\n\t]/.test(got)) return 'call_sign gives back the call sign with a line end or a tab still at one end. Take off everything that is not the call sign at both ends, not only spaces.'
          if (got.toUpperCase() === want) return 'call_sign is right but for its capital letters: every letter should be a capital.'
          if (got.replace(/\s/g, '') === want.replace(/\s/g, '')) return 'call_sign changed the spaces between the words. Only the ends lose their spaces.'
          return 'call_sign does not give back the call sign without its ends, in capitals.'
        }
      }))
    })
  },

  grid(t) {
    const list = [
      ['Spaces between the parts', 'nh 205 631', 'NH205631'],
      ['Spaces at the ends too', ' nc 2041 1873 ', 'NC20411873'],
      ['One space only', 'Ng 1234', 'NG1234'],
      ['No spaces at all', 'nm883467', 'NM883467']
    ]
    return dataCases(t, {
      file: FILE,
      task: 2,
      fn: 'grid_ref',
      text: true,
      typed:
        'grid_ref gives back the same text whatever Check gives it. Work on the grid reference it is given.',
      mistakes: [
        { value: (c) => c.args[0], hint: unchanged('grid_ref') },
        {
          value: (c) => c.args[0].trim().toUpperCase(),
          hint: 'grid_ref takes the spaces off the ends only, and the spaces between the letters and the digits are still there. Every space has to go, wherever it is.'
        },
        {
          value: (c) => c.args[0].replace(/ /g, ''),
          hint: 'grid_ref takes out every space, but does not give back capital letters.'
        }
      ],
      list: list.map(([name, raw, want]) => ({
        name,
        args: [raw],
        expected: want,
        hint: (v) => {
          const got = String(v.value)
          if (got.includes(' '))
            return 'grid_ref gives back a grid reference that still has a space in it. A method that replaces text gives back a new text and leaves the one it is called on as it was, so keep what it gives back.'
          if (got.toUpperCase() === want) return 'grid_ref is right but for its capital letters.'
          return 'grid_ref does not give back the grid reference with every space taken out, in capitals.'
        }
      }))
    })
  },

  urgent(t) {
    const list = [
      ['Starts with urgent in capitals', 'URGENT: MIKE TWO needs a second rope', true],
      ['Starts with urgent in small letters', 'urgent, send the stretcher team', true],
      ['Casualty in the middle', 'GOLF SIX: walker found, Casualty is cold', true],
      ['Urgent, but not at the start', 'HOTEL ONE: not urgent, walking out', false],
      ['A routine entry', 'Lima three back at the base', false],
      ['Casualty in capitals at the end', 'echo one has reached the CASUALTY', true]
    ]
    return dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'needs_rhona',
      text: true,
      typed:
        'needs_rhona gives back the same answer for every entry Check tries. Look at the entry it is given.',
      mistakes: [
        {
          value: (c) => c.args[0].toLowerCase().startsWith('urgent'),
          hint: 'needs_rhona gives back False for an entry with casualty in it. An entry counts when it starts with urgent, and also when casualty is anywhere in it.'
        },
        {
          value: (c) => c.args[0].startsWith('urgent') || c.args[0].includes('casualty'),
          hint: 'needs_rhona gives back False for an entry that has capitals where your code looks. Comparing text counts capitals: URGENT does not start with urgent. Turn the entry into one kind of letter before you ask.'
        }
      ],
      list: list.map(([name, entry, want]) => ({
        name,
        args: [entry],
        expected: want,
        hint: (v) => {
          if (v.type !== 'bool') return `needs_rhona gives back ${v.repr}, and the task asks for True or False.`
          if (!want && /urgent/i.test(entry))
            return 'needs_rhona gives back True for an entry that has urgent in it, but not at its start. Only an entry that starts with urgent counts; casualty counts anywhere.'
          if (want && /casualty/i.test(entry) && !/casualty/.test(entry))
            return 'needs_rhona gives back False for an entry with casualty in capitals. Comparing text counts capitals, so turn the entry into one kind of letter before you ask.'
          if (want && /^urgent/i.test(entry) && !/^urgent/.test(entry))
            return 'needs_rhona gives back False for an entry that starts with urgent in capitals. Comparing text counts capitals, so turn the entry into one kind of letter before you ask.'
          return want
            ? 'needs_rhona gives back False for an entry Rhona needs to see.'
            : 'needs_rhona gives back True for an entry Rhona does not need to see.'
        }
      }))
    })
  },

  message(t) {
    const list = [
      ['A call sign and a message', 'HOTEL ONE: two walkers, both well', 'two walkers, both well'],
      ['A time in the message', 'KILO FIVE: leaving the hut at 06:15', 'leaving the hut at 06:15'],
      ['No colon', 'radio check from MIKE TWO', ''],
      ['Spaces around the colon', 'lima three  :   at the cairn ', 'at the cairn'],
      ['A colon and nothing after it', 'GOLF SIX:', '']
    ]
    return dataCases(t, {
      file: FILE,
      task: 4,
      fn: 'message_of',
      text: true,
      typed:
        'message_of gives back the same text whatever entry Check gives it. Work on the entry it is given.',
      list: list.map(([name, entry, want]) => ({
        name,
        args: [entry],
        expected: want,
        hint: (v) => {
          const got = String(v.value)
          const colon = entry.indexOf(':')
          if (colon < 0 && got === entry.trim())
            return 'For an entry with no colon, message_of gives back the whole entry. find gives back -1 when it finds nothing, and a slice that starts one after -1 starts at 0: ask whether there is a colon first.'
          if (colon < 0) return 'For an entry with no colon, message_of should give back empty text.'
          if (got === entry.slice(colon + 1)) return 'message_of gives back the message with the spaces at its start or end still on.'
          if (got === entry.slice(colon).trim()) return 'message_of gives back the message with the colon still at its start. The message starts one position after the colon.'
          if (entry.lastIndexOf(':') !== colon && got === entry.slice(entry.lastIndexOf(':') + 1).trim())
            return 'message_of gives back the text after the last colon. The message starts after the first one, and a colon in a time belongs to the message.'
          if (entry.lastIndexOf(':') !== colon && entry.slice(colon + 1).startsWith(` ${got}`))
            return 'message_of stops the message at the second colon. A colon in a time belongs to the message: take everything after the first colon.'
          if (got === entry.slice(0, colon).trim()) return 'message_of gives back the call sign, the text before the colon. The task asks for the text after it.'
          return 'message_of does not give back the text after the first colon, without the spaces at its ends.'
        }
      }))
    })
  }
}

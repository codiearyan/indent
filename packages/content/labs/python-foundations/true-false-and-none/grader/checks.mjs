import { aKind, cases } from '../../grading.mjs'

const FILE = 'ready_to_go.py'

const team = (over = {}) => ({
  crew_ready: 5,
  crew_needed: 4,
  radio_channel: 6,
  team_channel: 6,
  stretcher_packed: true,
  casualty_name: null,
  ...over
})

const yes = { type: 'bool', value: true }
const no = { type: 'bool', value: false }

/** The words for a value that is not True or False at all. */
const notBool = (name, otherwise) => (v) =>
  !v || v.type === 'bool'
    ? otherwise
    : v.type === 'str'
      ? `${name} holds text, not True or False. A comparison or a name inside quotes is only text.`
      : v.type === 'NoneType'
        ? `${name} holds None. A line that prints or does nothing gives back None: give ${name} the comparison itself.`
        : `${name} holds ${aKind(v.type)}, not True or False. One = stores a value; to compare two values Python needs ==, <, >= and the like.`

export const checks = {
  crew(t) {
    return cases(t, {
      file: FILE,
      task: 1,
      name: 'enough_crew',
      typed:
        'Check changed the crew and enough_crew stayed the same. Build it by comparing crew_ready with crew_needed, not from True or False typed in.',
      list: [
        {
          name: 'More crew than needed is enough',
          given: team({ crew_ready: 7, crew_needed: 3 }),
          expected: yes,
          hint: notBool('enough_crew', 'With more crew ready than needed, there is enough.')
        },
        {
          name: 'Exactly the crew needed is enough',
          given: team({ crew_ready: 4, crew_needed: 4 }),
          expected: yes,
          hint: notBool(
            'enough_crew',
            'Exactly the crew needed is enough, but enough_crew says no. There are two comparisons for "bigger": one leaves out the equal case.'
          )
        },
        {
          name: 'Too few crew is not enough',
          given: team({ crew_ready: 2, crew_needed: 6 }),
          expected: no,
          hint: notBool('enough_crew', 'With fewer crew ready than needed, there is not enough.')
        }
      ]
    })
  },

  channel(t) {
    return cases(t, {
      file: FILE,
      task: 2,
      name: 'on_channel',
      typed:
        'Check changed the channels and on_channel stayed the same. Build it by comparing the two channel names, not from True or False typed in.',
      list: [
        {
          name: 'The same channel',
          given: team({ radio_channel: 3, team_channel: 3 }),
          expected: yes,
          hint: notBool(
            'on_channel',
            'Both channels are the same here, so on_channel should be True.'
          )
        },
        {
          name: 'A different channel',
          given: team({ radio_channel: 2, team_channel: 5 }),
          expected: no,
          hint: notBool('on_channel', 'The channels differ here, so on_channel should be False.')
        },
        {
          name: 'A channel one off',
          given: team({ radio_channel: 8, team_channel: 7 }),
          expected: no,
          hint: notBool(
            'on_channel',
            'The channels differ by one here, so on_channel should be False. Compare for the same value, not for bigger or smaller.'
          )
        }
      ]
    })
  },

  ready(t) {
    // Task 3 starts from enough_crew and on_channel as Tasks 1 and 2 should make them.
    const list = [
      ['Everything is ready', true, true, true, true],
      ['The stretcher is not packed', true, true, false, false],
      ['Not enough crew', false, true, true, false],
      ['The radio is on another channel', true, false, true, false],
      ['Nothing is ready', false, false, false, false]
    ]
    return cases(t, {
      file: FILE,
      task: 3,
      name: 'ready_to_go',
      list: list.map(([name, crew, channel, packed, ready]) => ({
        name,
        given: team({ stretcher_packed: packed }),
        inject: { enough_crew: crew, on_channel: channel },
        expected: ready ? yes : no,
        hint: notBool(
          'ready_to_go',
          ready
            ? 'Everything is ready here, so ready_to_go should be True.'
            : 'One thing is not ready here, so the team cannot go yet. ready_to_go is True only when all three are true. Check each of the three, and the word that joins them.'
        )
      }))
    })
  },

  name(t) {
    return cases(t, {
      file: FILE,
      task: 4,
      name: 'name_known',
      typed:
        'Check changed casualty_name and name_known stayed the same. Build it by asking about casualty_name, not from True or False typed in.',
      mistakes: [
        {
          value: () => true,
          hint: 'name_known is True in every case, even when casualty_name is None. None is not text and has no quotes: ask about None itself.'
        }
      ],
      list: [
        {
          name: 'No name yet',
          given: team({ casualty_name: null }),
          expected: no,
          hint: notBool('name_known', 'casualty_name is None here, so the name is not known yet.')
        },
        {
          name: 'A name was given',
          given: team({ casualty_name: 'Morven Gow' }),
          expected: yes,
          hint: notBool(
            'name_known',
            'casualty_name holds a name here, so it is known. None is not text: it has no quotes around it.'
          )
        },
        {
          name: 'Another name',
          given: team({ casualty_name: 'Iain Lindsay' }),
          expected: yes,
          hint: notBool('name_known', 'casualty_name holds a name here, so it is known.')
        }
      ]
    })
  }
}

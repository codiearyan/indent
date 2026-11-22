import { aKind, cases } from '../../grading.mjs'

const FILE = 'batteries.py'

const kit = (head_torches, batteries_per_torch, batteries_per_pack = 8) => ({
  head_torches,
  batteries_per_torch,
  batteries_per_pack
})

const whole = (name, hint) => (v) =>
  v?.type === 'float'
    ? `${name} is a decimal number here. A pack is either full or it is not: look at which kind of division you used.`
    : v && v.type !== 'int'
      ? `${name} holds ${aKind(v.type)}, not a whole number.`
      : hint

export const checks = {
  batteries(t) {
    return cases(t, {
      file: FILE,
      task: 1,
      name: 'batteries_needed',
      typed:
        'Check changed the kit and batteries_needed stayed the same. Use the names head_torches and batteries_per_torch, not numbers you typed.',
      mistakes: [
        {
          value: (g) => g.head_torches * 3,
          hint: 'batteries_needed gives every head torch three batteries, whatever batteries_per_torch says. Use that name, not a number you typed.'
        },
        {
          value: (g) => g.head_torches + g.batteries_per_torch,
          hint: 'batteries_needed adds the two numbers. Every torch takes the same number of batteries: which operator does that?'
        }
      ],
      list: [
        {
          name: 'Fills several torches',
          given: kit(11, 3),
          expected: { type: 'int', value: 33 },
          hint: whole(
            'batteries_needed',
            'batteries_needed should be the batteries for one torch, once for every torch.'
          )
        },
        {
          name: 'Fills one torch that takes four',
          given: kit(1, 4),
          expected: { type: 'int', value: 4 },
          hint: whole(
            'batteries_needed',
            'With one torch, the batteries needed are the batteries that torch takes.'
          )
        },
        {
          name: 'No torches need no batteries',
          given: kit(0, 3),
          expected: { type: 'int', value: 0 },
          hint: whole(
            'batteries_needed',
            'With no torches there is nothing to fill. Look at how the two names are combined.'
          )
        }
      ]
    })
  },

  packs(t) {
    // Task 2 starts from batteries_needed as Task 1 should make it.
    const list = [
      ['Packs with some left over', 33, 8, 4],
      ['Packs that come out even', 16, 8, 2],
      ['Too few for a whole pack', 5, 8, 0],
      ['Works with smaller packs', 30, 6, 5]
    ]
    return cases(t, {
      file: FILE,
      task: 2,
      name: 'full_packs',
      typed:
        'Check changed the numbers and full_packs stayed the same. Use the names batteries_needed and batteries_per_pack, not numbers you typed.',
      mistakes: [
        {
          value: (g, i) => Math.floor(i.batteries_needed / 8),
          hint: 'full_packs did not change when Check made the packs smaller. Use batteries_per_pack, not a number you typed.'
        }
      ],
      list: list.map(([name, needed, pack, value]) => ({
        name,
        given: kit(10, 3, pack),
        inject: { batteries_needed: needed },
        expected: { type: 'int', value },
        hint: whole(
          'full_packs',
          needed < pack
            ? 'Here there are too few batteries to fill one pack, so no pack is full. Look at how you divide: a pack that is only partly full does not count.'
            : 'full_packs should count only the packs that are completely full. Look at how you divide.'
        )
      }))
    })
  },

  loose(t) {
    const list = [
      ['Loose batteries after the full packs', 33, 8, 1],
      ['None left when the packs come out even', 16, 8, 0],
      ['All loose when no pack is full', 5, 8, 5],
      ['Works with other packs', 30, 7, 2]
    ]
    return cases(t, {
      file: FILE,
      task: 3,
      name: 'loose_batteries',
      typed:
        'Check changed the numbers and loose_batteries stayed the same. Use the names, not numbers you typed.',
      mistakes: [
        {
          value: (g, i) => i.batteries_needed - i.full_packs,
          hint: 'loose_batteries takes the number of packs away from the batteries, but each pack holds several batteries. Python has an operator that gives what is left over after dividing.'
        }
      ],
      list: list.map(([name, needed, pack, value]) => ({
        name,
        given: kit(10, 3, pack),
        inject: { batteries_needed: needed, full_packs: Math.floor(needed / pack) },
        expected: { type: 'int', value },
        hint: whole(
          'loose_batteries',
          'loose_batteries should be what is left over once every full pack is filled. Look at the part of the lesson on what is left after dividing.'
        )
      }))
    })
  },

  walk(t) {
    const list = [
      ['A walk that needs rounding', 10, 3, 3.3],
      ['A longer walk at a different pace', 8.4, 3, 2.8],
      ['A walk that comes out even', 6, 4, 1.5],
      ['A walk of whole hours', 9, 3, 3.0]
    ]
    return cases(t, {
      file: FILE,
      task: 4,
      name: 'walk_in_hours',
      typed:
        'Check changed the walk and walk_in_hours stayed the same. Use the names walk_in_km and walking_speed_kmh, not numbers you typed.',
      list: list.map(([name, km, speed, value]) => ({
        name,
        given: { walk_in_km: km, walking_speed_kmh: speed },
        expected: { type: 'float', value },
        hint: (v) => {
          if (v?.type !== 'int' && v?.type !== 'float')
            return `walk_in_hours holds ${aKind(v?.type)}, not a number of hours.`
          const near = [Math.floor(km / speed), Math.round(km / speed)].includes(v.value)
          if (near && (v.value !== value || v.type === 'int')) {
            return 'walk_in_hours is a whole number of hours, but a walk can take part of an hour. Look at which kind of division you used, and how many decimal places you round to.'
          }
          if (Math.abs(v.value - km / speed) < 0.1 && v.value !== value) {
            return 'Close. walk_in_hours has the right size, but it is not rounded to one decimal place.'
          }
          return 'walk_in_hours is not the distance at that speed. Hours are the distance divided by the speed.'
        }
      }))
    })
  }
}

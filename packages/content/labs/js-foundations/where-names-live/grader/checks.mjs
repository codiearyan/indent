import { code } from '../../grading.mjs'
import { calls, evaluate, readSource, shape } from '../../rules-grading.mjs'

const FILE = 'src/scope.js'

const loaded = (details) => ![`${FILE} runs`, 'Every call finishes'].includes(details[0].name)

export const checks = {
  async label(t) {
    const details = await calls(t, {
      file: FILE,
      fn: 'labelLine',
      list: [
        {
          name: 'A wrapped fig candle',
          expr: `labelLine('Fig', true)`,
          expected: 'Fig, gift wrapped',
          hint: 'With giftWrap true, the label ends in gift wrapped.'
        },
        {
          name: 'A plain amber candle',
          expr: `labelLine('Amber', false)`,
          expected: 'Amber, plain box',
          hint: 'With giftWrap false, the label ends in plain box.'
        }
      ]
    })
    for (const d of details) {
      if (/stops at wrap\b/.test(d.message ?? '')) {
        d.message =
          'labelLine stops at wrap. wrap is made with let inside the braces of the if and of the else, and a name made inside { } is gone after the closing brace. The return comes after them, so it cannot see wrap.'
      }
    }
    if (!loaded(details)) return details
    const outside = /^(?:let|const|var)\s+wrap\b/m.test(code(await readSource(t, FILE)))
    return [
      ...details,
      shape(
        'Keeps wrap inside labelLine',
        !outside,
        'wrap is now made at the top level of the file, outside labelLine, so the function reaches outside itself for it. Make wrap inside labelLine, before the if.'
      )
    ]
  },

  sale(t) {
    return calls(t, {
      file: FILE,
      fn: 'salePrice',
      list: [
        [2000, 25, 1500],
        [1250, 10, 1125],
        [3000, 50, 1500],
        [999, 0, 999]
      ].map(([price, off, expected]) => ({
        name: off ? `${off} percent off ${price}` : `No discount keeps ${price}`,
        expr: `salePrice(${price}, ${off})`,
        expected,
        hint: off
          ? 'Take percentOff percent off priceCents and round to whole cents.'
          : 'With a percentOff of 0 the price stays as it is.',
        explain: (v) =>
          off && v.value === price
            ? 'salePrice gave back the full price although percentOff is more than 0. The sale price is worked out inside the braces of the if, but the name the return hands back never gets it. A let inside braces makes a new name there, even when the same name is outside.'
            : undefined
      }))
    })
  },

  zone(t) {
    return calls(t, {
      file: FILE,
      fn: 'shippingNote',
      list: [
        {
          name: 'A national order goes by courier',
          expr: `shippingNote('national')`,
          expected: 'Sent by courier',
          hint: 'For the national zone the note is Sent by courier. Decide on the zone shippingNote is given.'
        },
        {
          name: 'An order abroad goes by air mail',
          expr: `shippingNote('abroad')`,
          expected: 'Sent by air mail',
          hint: 'For any zone that is not local or national the note is Sent by air mail.'
        },
        {
          name: 'A local order is hand delivered',
          expr: `shippingNote('local')`,
          expected: 'Hand delivered',
          hint: 'For the local zone the note is Hand delivered.'
        }
      ]
    }).then((details) =>
      details.map((d) =>
        /gave the same answer for every case/.test(d.message ?? '')
          ? {
              ...d,
              message:
                'shippingNote gave the same note for every zone Check tried. It decides on a name from outside the function instead of the zone it is given.'
            }
          : d
      )
    )
  },

  async note(t) {
    const details = await calls(t, {
      file: FILE,
      fn: 'packingNote',
      list: [
        {
          name: 'A heavy parcel',
          expr: `packingNote(1500)`,
          expected: 'Heavy box',
          hint: 'More than 1000 grams is a heavy box.'
        },
        {
          name: 'Exactly 1000 grams is light',
          expr: `packingNote(1000)`,
          expected: 'Light box',
          hint: 'The task says more than 1000 grams is heavy, so 1000 itself is light. Which comparison leaves out the equal case?'
        },
        {
          name: 'A light parcel',
          expr: `packingNote(300)`,
          expected: 'Light box',
          hint: '1000 grams or less is a light box.'
        }
      ]
    })
    if (!loaded(details)) return details
    const { results } = await evaluate(t, FILE, [
      `(() => {
        if (typeof lastNote === 'undefined') return 'gone'
        const before = lastNote
        try { packingNote(1500); packingNote(300) } catch {}
        return lastNote === before ? 'same' : 'changed'
      })()`
    ])
    const untouched = results?.[0]?.result?.value !== 'changed'
    return [
      ...details,
      shape(
        'Leaves lastNote alone',
        untouched,
        'packingNote still changes lastNote, a name outside it. Two parcels packed one after the other would overwrite each other\'s note. Give the note back with return and stop setting lastNote.'
      )
    ]
  }
}

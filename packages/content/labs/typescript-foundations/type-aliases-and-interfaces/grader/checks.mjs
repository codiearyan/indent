import { call, judge } from '../../grading.mjs'

const FILE = 'src/orders.ts'

export const checks = {
  line(t) {
    const label = (blend, tins, g) => `${tins} x ${blend}, ${g} g each`
    return judge(t, {
      file: FILE,
      task: 1,
      results: ['lineGrams', 'lineLabel'],
      named: [
        ['lineGrams', 'Line'],
        ['lineLabel', 'Line']
      ],
      uses: 'grader/types/line.uses.ts',
      misuse: 'grader/types/line.misuse.ts',
      messages: {
        uses: "Check's own code makes a Line and passes it to both functions, and the compiler refuses it. Compare the properties and types of Line with the task, and check that both functions take a Line.",
        misuse:
          "Check's own code makes a Line with a property missing or of the wrong type, or passes one to a function, and the compiler lets it through. Line should name all three properties with their types, and both functions should take a Line."
      },
      cases: [
        call(
          'lineGrams',
          [{ blend: 'Morning Keemun', tins: 2, gramsPerTin: 250 }],
          500,
          'lineGrams should give the tins times the grams per tin. Leave its body as the starter wrote it.'
        ),
        call(
          'lineLabel',
          [{ blend: 'Frost Sencha', tins: 4, gramsPerTin: 50 }],
          label('Frost Sencha', 4, 50),
          'lineLabel should give the tins, the blend and the grams per tin, as the starter wrote it. Leave its body as it was.'
        )
      ]
    })
  },

  customer(t) {
    const hint =
      'contactLine should give the name and the email, and the phone number after them only when there is one. Leave its body as the starter wrote it.'
    return judge(t, {
      file: FILE,
      task: 2,
      declared: { Customer: 'interface' },
      results: ['contactLine'],
      named: [
        ['contactLine', 'Customer'],
        ['firstCustomer', 'Customer']
      ],
      uses: 'grader/types/customer.uses.ts',
      misuse: 'grader/types/customer.misuse.ts',
      messages: {
        uses: "Check's own code makes a customer with a phone number and one without, and the compiler refuses one of them. A property a customer may leave out has to say so in the interface."
      },
      cases: [
        call(
          'contactLine',
          [{ name: 'Juniper Vale', email: 'juniper@example.com', phone: '01632 960771' }],
          'Juniper Vale, juniper@example.com, 01632 960771',
          hint
        ),
        call(
          'contactLine',
          [{ name: 'Fen Okafor', email: 'fen@example.com' }],
          'Fen Okafor, fen@example.com',
          hint
        )
      ]
    })
  },

  parcel(t) {
    return judge(t, {
      file: FILE,
      task: 3,
      results: ['shipTo'],
      named: [
        ['Parcel', 'Address'],
        ['shipTo', 'Parcel']
      ],
      uses: 'grader/types/parcel.uses.ts',
      misuse: 'grader/types/parcel.misuse.ts',
      messages: {
        uses: "Check's own code makes an Address and a Parcel that goes to it, and the compiler refuses it. Compare the properties and types of both with the task: to should be an Address."
      },
      cases: [
        call(
          'shipTo',
          [
            {
              orderId: 'OK-5120',
              grams: 600,
              to: {
                name: 'Fen Okafor',
                street: '12 Weir Road',
                town: 'Lowmarsh',
                postcode: 'OH9 1AB'
              }
            }
          ],
          'OK-5120 to Fen Okafor, Lowmarsh OH9 1AB',
          'shipTo should give the order id, the name, the town and the postcode, as the starter wrote it. Leave its body as it was.'
        )
      ]
    })
  },

  batch(t) {
    const hint =
      "batchLabel should give the blend, the grams with ' g', and 'batch' with the batch number, separated by a comma and a space."
    return judge(t, {
      file: FILE,
      task: 4,
      results: ['batchLabel'],
      named: [['BatchTin', 'Tin']],
      uses: 'grader/types/batch.uses.ts',
      misuse: 'grader/types/batch.misuse.ts',
      messages: {
        uses: "Check's own code makes a plain Tin and a BatchTin, uses the batch tin as a tin and labels it, and the compiler refuses one of them. A plain tin has no batch number, and a batch tin has everything a tin has as well as its batch."
      },
      cases: [
        call(
          'batchLabel',
          [{ blend: 'Frost Sencha', grams: 50, batch: 7 }],
          'Frost Sencha, 50 g, batch 7',
          hint
        ),
        call(
          'batchLabel',
          [{ blend: 'Hearth Assam', grams: 250, batch: 12 }],
          'Hearth Assam, 250 g, batch 12',
          hint
        )
      ]
    })
  }
}

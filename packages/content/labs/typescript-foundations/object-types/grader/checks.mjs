import { call, judge } from '../../grading.mjs'

const FILE = 'src/orders.ts'

export const checks = {
  line(t) {
    const hint =
      'lineGrams should give the tins times the grams per tin. Leave its body as the starter wrote it.'
    return judge(t, {
      file: FILE,
      task: 1,
      results: ['lineGrams'],
      uses: 'grader/types/line.uses.ts',
      misuse: 'grader/types/line.misuse.ts',
      messages: {
        uses: "Check's own code weighs an order line, and a whole line that has a blend as well, and the compiler refuses one of them. Compare the properties and types in your object type with the task: an object with more properties than the type names is still allowed."
      },
      cases: [
        call('lineGrams', [{ tins: 2, gramsPerTin: 250 }], 500, hint),
        call('lineGrams', [{ tins: 6, gramsPerTin: 50 }], 300, hint)
      ]
    })
  },

  slip(t) {
    return judge(t, {
      file: FILE,
      task: 2,
      results: ['slipText'],
      uses: 'grader/types/slip.uses.ts',
      misuse: 'grader/types/slip.misuse.ts',
      messages: {
        uses: "Check's own code makes a slip for an order with a gift note and for one without, and the compiler refuses one of them. A property an object may leave out has to say so in the type."
      },
      cases: [
        call(
          'slipText',
          [{ id: 'OK-3001', giftNote: 'With love' }],
          'Order OK-3001, note: With love',
          "With a gift note, slipText should give 'Order ', the id, ', note: ' and the note."
        ),
        call(
          'slipText',
          [{ id: 'OK-3002' }],
          'Order OK-3002',
          "Without a gift note, slipText should give only 'Order ' and the id. If you see undefined, the body still reads a note that is not there."
        )
      ]
    })
  },

  first(t) {
    return judge(t, {
      file: FILE,
      task: 3,
      annotated: ['firstOrder'],
      uses: 'grader/types/first.uses.ts',
      misuse: 'grader/types/first.misuse.ts',
      messages: {
        uses: "Check's own code reads the id of firstOrder and changes its tins, and the compiler refuses it. Only the id should be fixed: the tins may still change.",
        misuse:
          "Check's own code gives firstOrder a new id, and the compiler lets it through. The type of firstOrder should say that its id can never change."
      },
      cases: [
        {
          name: 'The first order keeps its id and gets its extra tin',
          read: 'firstOrder',
          expected: { id: 'OK-1042', tins: 4 },
          setup: 'firstOrder, after the lines of Task 3',
          hint: 'After the lines of Task 3, firstOrder should still have the id OK-1042, and the tin the customer added. Remove only the line that changes the id.'
        }
      ]
    })
  },

  parcel(t) {
    return judge(t, {
      file: FILE,
      task: 4,
      results: ['parcelFor'],
      uses: 'grader/types/parcel.uses.ts',
      misuse: 'grader/types/parcel.misuse.ts',
      messages: {
        uses: "Check's own code reads orderId, grams and heavy from a parcel, and the compiler refuses it. The result type should be an object type that names all three with their types."
      },
      cases: [
        call(
          'parcelFor',
          ['OK-4100', 2500],
          { orderId: 'OK-4100', grams: 2500, heavy: true },
          'parcelFor should give an object with orderId, grams and heavy, and heavy should be true for a parcel over 2000 g.'
        ),
        call(
          'parcelFor',
          ['OK-4101', 2000],
          { orderId: 'OK-4101', grams: 2000, heavy: false },
          'A parcel of exactly 2000 g is not heavy: only more than 2000 g is.'
        )
      ]
    })
  }
}

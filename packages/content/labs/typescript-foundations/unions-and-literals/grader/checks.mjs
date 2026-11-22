import { call, judge } from '../../grading.mjs'

const FILE = 'src/delivery.ts'

export const checks = {
  refs(t) {
    const hint =
      "refLine should give 'order ' and the ref, as the starter wrote it. Leave its body as it was."
    return judge(t, {
      file: FILE,
      task: 1,
      results: ['refLine'],
      annotated: ['todaysRefs'],
      uses: 'grader/types/refs.uses.ts',
      misuse: 'grader/types/refs.misuse.ts',
      messages: {
        uses: "Check's own code passes refLine an old ref that is a number and a new one that is text, and adds both kinds to todaysRefs, and the compiler refuses one of them. The parameter and each entry of the list should take either kind.",
        misuse:
          "Check's own code passes something that is not a ref, or adds one to todaysRefs, and the compiler lets it through. A ref is a number or text, and nothing else."
      },
      cases: [
        call('refLine', [1043], 'order 1043', hint),
        call('refLine', ['OK-2210'], 'order OK-2210', hint)
      ]
    })
  },

  zone(t) {
    const hint =
      'zoneFee should give the fee the starter gave for each zone. Leave its body as it was.'
    return judge(t, {
      file: FILE,
      task: 2,
      named: [['zoneFee', 'Zone']],
      uses: 'grader/types/zone.uses.ts',
      misuse: 'grader/types/zone.misuse.ts',
      messages: {
        uses: "Check's own code uses each of the three zones, and the compiler refuses one of them. Compare the words in Zone with the task, letter by letter.",
        misuse:
          "Check's own code passes a zone the courier does not know, or any text at all, and the compiler lets it through. Zone should allow the three words of the task and nothing else."
      },
      cases: [call('zoneFee', ['europe'], 1200, hint), call('zoneFee', ['local'], 295, hint)]
    })
  },

  status(t) {
    const hint =
      "nextStatus should give 'packed' after 'paid', 'sent' after 'packed', and 'sent' after 'sent'."
    return judge(t, {
      file: FILE,
      task: 3,
      results: ['nextStatus'],
      named: [['nextStatus', 'Status']],
      uses: 'grader/types/status.uses.ts',
      misuse: 'grader/types/status.misuse.ts',
      messages: {
        uses: "Check's own code uses each of the three statuses, and uses what nextStatus gives back as one of them, and the compiler refuses it. Compare the words in Status with the task, and check that the result type says one of the three words, not any text.",
        misuse:
          "Check's own code passes a status the shop does not use, and the compiler lets it through. Status should allow the three words of the task and nothing else, and nextStatus should take a Status."
      },
      cases: [
        call('nextStatus', ['paid'], 'packed', hint),
        call('nextStatus', ['packed'], 'sent', hint),
        call('nextStatus', ['sent'], 'sent', hint)
      ]
    })
  },

  delivery(t) {
    return judge(t, {
      file: FILE,
      task: 4,
      annotated: ['todaysDeliveries'],
      named: [['todaysDeliveries', 'Delivery']],
      uses: 'grader/types/delivery.uses.ts',
      misuse: 'grader/types/delivery.misuse.ts',
      messages: {
        uses: "Check's own code makes a delivery of each kind, with what that kind needs, and reads its kind, and the compiler refuses one of them. Compare each shape in Delivery with the task: its kind and the one property it needs.",
        misuse:
          "Check's own code makes a delivery that is missing what its kind needs, has what another kind needs, or has a kind the shop does not use, and the compiler lets it through. Each shape should have its own exact kind, and only the property that kind needs."
      },
      cases: [
        {
          name: "Today's deliveries are right",
          read: 'todaysDeliveries',
          expected: [
            { kind: 'post', address: '4 Mill Lane, Bramwell' },
            { kind: 'locker', locker: 'L-17' },
            { kind: 'collect' }
          ],
          setup: 'todaysDeliveries, after the lines of Task 4',
          hint: 'todaysDeliveries should keep the same three parcels, in the same order, each with what its kind needs. Fix only the entry the compiler points at, and keep its locker number.'
        }
      ]
    })
  }
}

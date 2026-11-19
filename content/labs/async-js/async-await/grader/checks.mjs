import { runCases, same } from '../../checks-helpers.mjs'

const REPORT = { route: 'quay-gull', time: '09:30', sea: 'choppy' }
const SAILINGS = [
  { id: 'S1', time: '09:30' },
  { id: 'S2', time: '13:00' }
]
const FAST = ['getSailings', 'getCrew', 'getWeather']
const fulfilledWith = (expected) => (v) => v.state === 'fulfilled' && same(v.value, expected)
const rejectedWith = (message) => (v) =>
  v.state === 'rejected' && v.error.message === message && v.unhandled.length === 0
const allCalls = (v) => v.steps.at(-1).started
const startedAfter = (v, name) => v.steps.find((s) => s.after === name)?.started ?? []

export const checks = {
  rewrite(t) {
    return runCases(t, 'sailingReport', [
      {
        name: 'Is an async function that uses await',
        run: 'rewriteCase',
        args: ['ok'],
        pass: (v) => v.isAsync && v.usesAwait && !v.usesThen,
        setup: 'reading how sailingReport is written',
        hint: 'Mark the function async and replace each .then() with an await. There should be no .then( left in it.'
      },
      {
        name: 'Still combines the sailing and the sea state',
        run: 'rewriteCase',
        args: ['ok'],
        pass: (v) =>
          fulfilledWith(REPORT)(v) && same(v.events, ['getSailing quay-gull', 'sailing answered', 'getSeaState 09:30']),
        setup: "sailing { route: 'quay-gull', time: '09:30' }, sea 'choppy'",
        hint: 'The result should be the same object as before. Wait for the sailing, then ask for the sea state with its time.'
      },
      {
        name: 'A sea state failure rejects the report',
        run: 'rewriteCase',
        args: ['seaFails'],
        pass: rejectedWith('Sea sensor offline'),
        setup: "getSeaState rejects with Error('Sea sensor offline')",
        hint: 'An awaited rejection throws inside your function. Let it escape so the report rejects with the same error.'
      },
      {
        name: 'A sailing failure rejects the report',
        run: 'rewriteCase',
        args: ['sailingFails'],
        pass: (v) =>
          rejectedWith('Timetable service is down')(v) && !v.events.some((e) => e.startsWith('getSeaState')),
        setup: "getSailing rejects with Error('Timetable service is down')",
        hint: 'When getSailing fails, the report should reject with its error and never ask for the sea state.'
      }
    ])
  },

  parallel(t) {
    return runCases(t, 'loadDashboard', [
      {
        name: 'Returns the dashboard',
        run: 'dashboardCase',
        args: [FAST],
        pass: fulfilledWith({ sailings: SAILINGS, weather: 'fog', crew: ['Odile', 'Ines'] }),
        setup: "sailings S1 and S2, weather 'fog', crew of S1 ['Odile', 'Ines']",
        hint: 'Resolve with { sailings, weather, crew }, where crew belongs to the first sailing.'
      },
      {
        name: 'Starts sailings and weather together',
        run: 'dashboardCase',
        args: [FAST],
        pass: (v) =>
          v.steps[0].started.includes('getSailings quay-gull') && v.steps[0].started.includes('getWeather quay-gull'),
        setup: 'the calls that had started before any service answered',
        hint: 'The weather does not depend on the sailings. Start both before you wait for either.'
      },
      {
        name: 'Asks for the crew as soon as the sailings arrive',
        run: 'dashboardCase',
        args: [FAST],
        pass: (v) =>
          !v.steps[0].started.some((c) => c.startsWith('getCrew')) &&
          startedAfter(v, 'getSailings').includes('getCrew S1') &&
          allCalls(v).filter((c) => c.startsWith('getCrew')).length === 1,
        setup: 'sailings answer first while the weather is still on its way; calls started after each answer',
        hint: 'The crew only needs the sailings. Does your code wait for the weather before it asks for the crew?'
      },
      {
        name: 'No sailings means no crew call',
        run: 'dashboardCase',
        args: [FAST, []],
        pass: (v) =>
          fulfilledWith({ sailings: [], weather: 'fog', crew: [] })(v) &&
          !allCalls(v).some((c) => c.startsWith('getCrew')),
        setup: 'getSailings resolves with []',
        hint: 'With no sailings there is nobody to ask about. crew should be [] and getCrew should not be called.'
      },
      {
        name: 'A weather failure is never left unhandled',
        run: 'dashboardCase',
        args: [['getWeather', 'getSailings', 'getCrew'], SAILINGS, true],
        pass: rejectedWith('Weather station offline'),
        setup: "getWeather rejects with Error('Weather station offline') while the sailings are still loading",
        hint: 'A promise you started but have not awaited yet has nobody listening when it rejects, and Node reports it as unhandled. Wait for both together in a way that listens to both from the start.'
      }
    ])
  },

  finally(t) {
    return runCases(t, 'saveBooking', [
      {
        name: 'Saves, emails, then unlocks',
        run: 'bookingCase',
        args: ['ok'],
        pass: (v) =>
          fulfilledWith({ saved: true, emailed: true })(v) &&
          same(v.events, ['store B7', 'stored', 'email B7', 'emailed', 'unlock 4A']),
        setup: 'storeBooking and emailTicket both work; the order of calls',
        hint: 'Wait for the save, then wait for the email, then unlock the seat once. Resolve with { saved: true, emailed: true }.'
      },
      {
        name: 'A failed email still saves the booking',
        run: 'bookingCase',
        args: ['emailFails'],
        pass: fulfilledWith({ saved: true, emailed: false }),
        setup: "emailTicket rejects with Error('Mail server refused')",
        hint: 'The booking is stored even when the email fails. Catch that one failure and resolve with emailed: false. Did you await the email inside the try?'
      },
      {
        name: 'Unlocks only after the email has finished',
        run: 'bookingCase',
        args: ['emailFails'],
        pass: (v) =>
          same(v.events, ['store B7', 'stored', 'email B7', 'email failed', 'unlock 4A']) && v.unhandled.length === 0,
        setup: 'emailTicket rejects; the order of calls and any rejection nobody handled',
        hint: 'unlockSeat ran before the email settled, ran twice, or a rejection was left unhandled. A promise you do not await is not covered by try, catch or finally.'
      },
      {
        name: 'A failed save rejects and still unlocks',
        run: 'bookingCase',
        args: ['storeFails'],
        pass: (v) =>
          rejectedWith('Booking database is busy')(v) && same(v.events, ['store B7', 'store failed', 'unlock 4A']),
        setup: "storeBooking rejects with Error('Booking database is busy')",
        hint: 'The caller must see the save error, the ticket must not be sent, and the seat must still be unlocked. Which block runs whether or not something threw?'
      }
    ])
  }
}

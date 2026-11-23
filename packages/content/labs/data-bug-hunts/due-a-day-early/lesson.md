# Due a day early

## What you will be able to do

Every invoice at Wrenhaven Scores has a due date, and a week before it Kwame sends the choir a reminder. The reminders come from his laptop, wherever his laptop happens to be. By the end of this issue you will be able to:

- say what JavaScript does with a date written as text, with and without a time
- tell a calendar date from a moment in time, and keep each one what it is
- write a test that shows a time zone bug on any computer, not only on yours
- count the days between two dates without being caught by a clock change

## The ticket

Kwame Bediako keeps the accounts. He files this one from Vancouver, where he is visiting his sister.

> **Kwame:** WH-38. I sent the March reminders from here on the 27th. Cedar Narrows wrote back straight away: their invoice says due 31 March, my reminder says Monday 30 March. Every reminder I sent is a day early. When I send them from home they are fine. Or I think they are.

The demo prints the reminders three times: on your computer, and as they come out on a computer set to Vancouver's time zone and to Tokyo's.

## A date as text is read at midnight somewhere

`new Date(text)` reads a date written as text, and the result is a moment in time: a number of milliseconds since the start of 1970 in Greenwich. Where that moment falls depends on how the text is written:

```js
new Date('2026-07-04') // midnight in UTC, Greenwich time
new Date('2026-07-04T00:00') // midnight on this computer
new Date(2026, 6, 4) // midnight on this computer, months count from 0
```

A date with no time is read as midnight in UTC. A date with a time but no zone, and the numbers form, are read in the computer's own zone. That rule is old and it surprises everyone once.

Reading the moment back has the same split. `getDate()`, `getDay()` and `getMonth()` answer for the computer's zone. `getUTCDate()`, `getUTCDay()` and `getUTCMonth()` answer for UTC. `toLocaleDateString` and `Intl.DateTimeFormat` show a moment in the computer's zone too, unless you give them a `timeZone` option.

Midnight in Greenwich on 4 July is still 3 July in Vancouver, seven hours behind in summer. So a concert date read with `new Date('2026-07-04')` and shown with `getDate()` says 3 on any computer west of Greenwich, and 4 everywhere else. Nothing in the code changed. Only the computer did.

## A calendar date is not a moment

A due date is a calendar date: a day on the calendar, the same day for everyone. A reminder sent at 9:05 is a moment. Mixing them is the bug.

The fix keeps a calendar date in one fixed zone from the moment it is read to the moment it is shown. UTC is the usual choice because it never changes its clocks. `Date.UTC(year, month - 1, day)` gives the moment at midnight UTC on that day, and the `getUTC` getters read the same day back, on every computer. Counting days works the same way: the difference between two UTC midnights is always a whole number of 24 hour days, so dividing by the milliseconds in a day gives the count.

Two quick fixes look as if they work. Adding an hour, or twelve, to the moment moves the bug to other zones: a computer twelve hours or more ahead of Greenwich is pushed onto the next day. Reading everything in the computer's own zone is closer, but between two local midnights there can be 23 or 25 hours, on the nights the clocks change.

## A test that shows it on any computer

Your computer has one time zone, so a test that does not say which zone it runs in tests only yours. If you live east of Greenwich, a test of the ticket passes on the shop's code, and the bug ships.

Node reads the time zone from `process.env.TZ`, and changing it while a program runs changes the zone for every date after that. The test file has a small helper that does it and puts the zone back:

```js
inZone('Asia/Kolkata', () => {
  expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(-330)
})
```

Zones are names like `'Europe/London'`, `'America/Vancouver'` or `'Asia/Tokyo'`. Check runs your tests on three computers, in Vancouver, Kolkata and Kiritimati, and a test of a bug must fail on all of them. A test that fails only where you are does not count.

## The case next door

The ticket came from the west, where the date moved back. East of Greenwich the date looks right, and the shop's code goes wrong in a quieter place. The demo's Tokyo block shows where. The `'next door'` block is for that test.

## Your work in this issue

Run `node src/demo.js` and read the three blocks against `invoices.js`. Then:

1. In `src/reminder.test.js`, write the ticket's tests with `inZone`, and run `npx vitest run src/reminder.test.js`. They should fail.
2. Fix `reminder()` in `src/reminder.js`, and run the demo again: the three blocks should agree.
3. Write the test for the case next door.

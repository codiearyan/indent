# A renewal that skips February

## What you will be able to do

The reminders now show the right date on any laptop. Most choirs pay Wrenhaven by the month for the arrangements they sing, so the next thing the code does with dates is add to them: a month to a licence, a week to a reminder. By the end of this issue you will be able to:

- say why a month and a day are not fixed lengths of time
- add months to a date so it stays in the month you meant
- add days so a time of day stays where it was, across a clock change
- test the edges of the calendar: month ends, leap years and clock changes

## The ticket

> **Kwame:** WH-44. Ängsö Kammarkör took a monthly licence on 31 January. Their next invoice went out on 3 March, and they never had one for February, so March looked like two months at once. Also, the week the clocks went forward, every follow-up we send a week after a reminder went out at ten instead of nine. I checked, nobody touched the job.

The demo prints the next three renewals for each licence and the follow-ups, on your computer and on one set to London, where the shop is.

## A month is not a length of time

`setMonth` moves a date to another month and keeps its day number. When that month is too short, JavaScript does not complain. It rolls the extra days over into the next month:

```js
const rehearsal = new Date(2026, 4, 31) // 31 May
rehearsal.setMonth(rehearsal.getMonth() + 1) // 31 June does not exist
console.log(rehearsal.toDateString()) // Wed Jul 01 2026
```

Adding 30 days instead is wrong in a different way: months have 28 to 31 days, so "a month as thirty days" drifts away from the day you started on. A calendar has a rule for this, and the shop chose the common one: keep the day, and when the month is too short, take its last day. 31 January renews on 28 February, or on 29 February in a leap year, and every renewal counts from the start date, so the one after that is 31 March, not 28 March.

`Date.UTC` helps with both halves. It rolls numbers over the way a calendar does, so day 32 of January is 1 February, and day 0 of a month is the last day of the month before:

```js
new Date(Date.UTC(2026, 6, 0)).getUTCDate() // 30, the last day of June
new Date(Date.UTC(2028, 2, 0)).getUTCDate() // 29, February in a leap year
```

A table of month lengths written by hand looks simpler, and it forgets leap years.

## A day is not always 24 hours

On the computer's own clock most days are 24 hours long. Twice a year in many zones they are not: the night the clocks go forward has 23 hours, the night they go back has 25. Adding days as blocks of 24 hours lands an hour out:

```js
// on a computer in London
const choir = new Date('2026-10-20T19:00')
const nextWeek = new Date(choir.getTime() + 7 * 24 * 60 * 60 * 1000)
console.log(nextWeek.getHours()) // 18
```

A weekly rehearsal at seven moved to six, because the clocks went back on 25 October. Adding one hour to fix it breaks the spring, and every computer in a zone with no clock changes.

The cure is the same as last time: do calendar sums where every day is 24 hours. In UTC there are no clock changes, so `Date.UTC(year, month - 1, day + 7)` is always seven calendar days later. A follow-up's time is shop time written as text, so keep that text as it was and only move the date in front of it.

The ticket's renewal bug fails on every computer. The follow-up bug only shows on a computer whose clocks change that night, so its test must say which zone it runs in, with `inZone`, as in the last issue.

## The cases next door

The ticket is about a short month. Right next to it are two edges a fix can still miss: the end of February in a leap year, and a week with a clock change in it. The `'next door'` block is for a test of each. Check runs them beside a version that knows only 28 days for February, and one that still adds days in 24 hour blocks.

## Your work in this issue

Run `node src/demo.js` and read both blocks. Then:

1. In `src/renewals.test.js`, write the ticket's tests and run `npx vitest run src/renewals.test.js`. They should fail.
2. Fix `renewsOn()` and `remindAt()` in `src/renewals.js`.
3. Write the tests for the two cases next door.

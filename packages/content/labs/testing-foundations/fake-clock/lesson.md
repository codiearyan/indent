# Standing in for the clock

## What you will be able to do

The form now reads Wendell's counts right. The next part of it reads the clock: whether an order still goes out this Friday depends on when it is placed, and a basket on the form is held for a few minutes and then let go. A test that runs at the real time only checks the moment you run it. By the end of this issue you will be able to:

- set the date and time a test runs at, with a fake clock
- move time on in a test without waiting for it
- put the real clock back after every test, even one that fails
- tell a test that passes on any day from one that passes today

## The request from Bridget

> **Bridget:** Orders close on Wednesday at six, so Wendell has Thursday to pick and pack. Last week someone ordered at ten past six on Wednesday and the form promised them Friday. And the other day the form held the last squash for a customer for an hour. It should let go after fifteen minutes. Can you test the times, without sitting here till Wednesday evening?

The code is in `src/schedule.js`. `ordersOpen` says whether an order placed now still goes out on the coming Friday, `deliveryDay` gives the date of the Friday it goes out on, and `holdBasket` holds the items in a basket for `HOLD_MINUTES`.

## A test that reads the real clock

Say the farm's gate shop is open from 8 to 5, every day but Monday:

```js
export function shopOpen() {
  const now = new Date()
  return now.getDay() !== 1 && now.getHours() >= 8 && now.getHours() < 17
}
```

`new Date()` is the real date and time. So `expect(shopOpen()).toBe(true)` passes on a Saturday morning and fails on Monday, with no change to the code: a failure might be a mistake, or it might be Monday.

Check runs your tests as if it were another day and another time than today. A test that does not set the date itself fails there.

## Setting the clock

Vitest can stand in for the clock. `vi` comes from `vitest`, next to `test` and `expect`:

```js
import { test, expect, vi } from 'vitest'

test('the shop is open on Saturday at 10', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 2, 7, 10, 0))
  expect(shopOpen()).toBe(true)
})
```

`vi.useFakeTimers()` swaps the clock for a fake one that only moves when the test says so. `vi.setSystemTime` sets the fake clock to a date: from then on, `new Date()` in the code under test gives that date. In `new Date(2026, 2, 7, 10, 0)` the month counts from 0, so 2 is March, and the time is in your computer's own time zone. 7 March 2026 is a Saturday.

## Moving time on

Timers run on the fake clock too. Say a pan of jam sets 8 minutes after it starts to boil:

```js
export function boilJam(pan) {
  pan.state = 'boiling'
  setTimeout(() => {
    pan.state = 'set'
  }, 8 * 60 * 1000)
}
```

A test should not wait 8 real minutes, and Vitest stops one that runs longer than a few seconds. With the fake clock on, move time on instead:

```js
test('jam is not set before 8 minutes, then it is', () => {
  vi.useFakeTimers()
  const pan = {}
  boilJam(pan)
  vi.advanceTimersByTime(8 * 60 * 1000 - 1)
  expect(pan.state).toBe('boiling')
  vi.advanceTimersByTime(1)
  expect(pan.state).toBe('set')
})
```

`vi.advanceTimersByTime` takes milliseconds, and runs every timer that falls due on the way. Checking just before the time is up, and at it, is the edge idea again. If you forget `vi.useFakeTimers()`, Vitest says so:

```
Error: A function to advance timers was called but the timers APIs are not mocked. Call `vi.useFakeTimers()` in the test file first.
```

## Put the clock back

The fake clock stays on until something turns it off, and that is not the end of the test. Run the Saturday test above, and then this one, on a Monday:

```js
test('the shop is closed', () => {
  expect(shopOpen()).toBe(false)
})
```

```
 FAIL  src/shop.test.js > the shop is closed
AssertionError: expected true to be false // Object.is equality
```

The shop is closed on Mondays, but the test still ran on the fake Saturday the test before it left behind. Each test must start from the same place, whatever ran before it. Check runs each of your tests alone too, and a test that only passes after another fails there.

`vi.useRealTimers()` puts the real clock back. A line at the end of a test is not enough: a test stops at the first `expect` that fails, and the lines after it never run. Vitest has hooks for this:

```js
import { beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})
```

`beforeEach` runs before every test, and `afterEach` after every test, passed or failed. At the top of the file, outside the `describe` blocks, they run around every test in it.

## Your work in this issue

Open `src/schedule.test.js`; the code is in `src/schedule.js`. Each of the first three tasks has its own `describe` block, and the last is about the whole file. Run `npx vitest run src/schedule.test.js` after each test, and press Check when they all pass.

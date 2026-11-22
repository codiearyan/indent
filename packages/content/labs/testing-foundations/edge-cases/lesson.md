# Testing the edges

## What you will be able to do

Effie can now tell which rule broke from the name of a failing test. Next up is the delivery code, which decides who pays for delivery and how Wendell loads the van. It looks simple, and every test Lorcan ever wrote for it passed, yet it has gone wrong twice this year. Both times the mistake sat where an ordinary example never looks. By the end of this issue you will be able to:

- find the edges of a rule: the exact line, the empty case, the first and the last
- pick test values that sit right on those edges
- explain why a test of a typical value can pass on broken code

## The request from Bridget

> **Bridget:** A customer spent exactly forty pounds and we charged her for delivery. The rule says forty or more is free. And one Friday in January the van screen crashed because there were no boxes at all. Lorcan's tests all used ordinary orders. Can yours look at the awkward ones?

The code is in `src/delivery.js`: the delivery charge, the total weight of a load, the heaviest box, and how many trips the van needs.

## Where mistakes hide

Most code works for the middle of its range. A free delivery rule gives the right answer for a 10 pound order and a 100 pound order almost however it is written. Mistakes hide at the edges, where the code has to make a choice:

- **The line itself.** A rule like "40 or more" has a line at exactly 40. Writing `>` instead of `>=` only changes the answer for an order of exactly 40.
- **Just either side of the line.** A rule written against the wrong number, say 35 instead of 40, only shows between the two.
- **Nothing at all.** An empty list, zero items, no text. Code often assumes there is at least one.
- **The first and the last.** Loops that start one place too late or stop one place too early skip the first or the last item.
- **Exact fits.** When things are split into groups, the cases where they fit exactly, and where one is left over, are where rounding goes wrong.

A test with a typical value is still worth having, because it shows the ordinary case works. But it cannot catch an edge mistake, because the wrong code and the right code agree in the middle.

## Finding the edges of a rule

Take the farm's open day, where children under 16 get in free:

```js
export function ticketPrice(age) {
  return age < 16 ? 0 : 5
}
```

Testing ages 8 and 40 proves little. The line is at 16, so test right on it and right below it:

```js
describe('ticketPrice', () => {
  test('lets a 15 year old in free', () => {
    expect(ticketPrice(15)).toBe(0)
  })

  test('charges a 16 year old', () => {
    expect(ticketPrice(16)).toBe(5)
  })
})
```

If someone writes `age <= 16`, the second test fails. If someone writes `age < 15`, the first one does. Each name says which side of the line it checks.

For prices, which have pennies, "right below" means as close as money allows: one penny under.

## Nothing, first and last

For code that takes a list, always ask what should happen with an empty one, and test it. "Should happen" is the key: decide the right answer from the rule, then check that exact answer comes back. A test that only checks nothing crashed passes on code that quietly gives back `undefined`.

For code that searches a list, put the item it should find at the very start in one test and at the very end in another. If it sits in the middle, a loop that skips an end still finds it, and the test passes.

```js
test('finds the oldest visitor when they are first in the queue', () => {
  expect(oldest([grandad, child, parent])).toEqual(grandad)
})

test('finds the oldest visitor when they are last in the queue', () => {
  expect(oldest([child, parent, grandad])).toEqual(grandad)
})
```

## Exact fits and leftovers

When things are shared out into groups of a fixed size, like six eggs to a carton, test three counts: none at all, exactly one full group, and one more than a full group. 0 eggs need no cartons, 6 eggs need one, and 7 eggs need two. Each count catches a different slip in the rounding, so you need all three.

## Your work in this issue

Open `src/delivery.test.js`; the code is in `src/delivery.js`. For each function, read the rule, write down its edges, and work out the right answer at each one before you write a test. Run `npx vitest run src/delivery.test.js` after each test. Check runs your tests on versions with a mistake at one edge, so each edge needs a test that sits right on it.

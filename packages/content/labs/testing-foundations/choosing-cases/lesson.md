# Choosing the cases

## What you will be able to do

Your tests now stand alone and check what the code does. This issue is about which examples they use. A test only proves something about the cases it tries, so choosing them is most of the work. By the end of this issue you will be able to:

- turn a customer's bug report into the smallest test that fails
- read a rule and list every case it has, edges included
- tell a test that proves something new from one that repeats another

## The request from Effie

> **Effie:** Nell Hollis rang. Medium box, two large, two dozen eggs, the HARVEST code, and she paid 44.70 when it should have been 66.30. She was very nice about it. And Lorcan left eight tests for the egg prices, all green, so I suppose those are fine?

The code is in `src/bill.js`. `bill` adds up the boxes, takes a tenth off them for the code `HARVEST`, and adds `eggPrice` for the eggs. The bug that charged Nell is still in your copy.

## From a report to a test

A report tells you everything the customer did, and most of it has nothing to do with the bug. Say a customer at the jam stall writes: "I bought two plum, a quince and a honey, with my stall card and a jute bag, and the till said 16." The stall's rule is three plum jars for 10 pounds.

Start with a test of the whole report, and the answer the price list gives. Run it: it fails, so it shows the bug. Then take out one detail at a time, work the right answer out again, and run it again:

- Without the jute bag it still fails, so the bag does not matter. Leave it out.
- Without the stall card it still fails. Leave it out.
- Without one of the plum jars it still fails. Leave it out.
- Without the quince it passes. Put it back: the quince is part of the bug.

What is left is the smallest test that fails:

```js
test('three jars that are not all plum get no deal', () => {
  expect(jamTotal(['plum', 'quince', 'honey'])).toBe(15)
})
```

```
 × src/jam.test.js > three jars that are not all plum get no deal 6ms
   → expected 10 to be 15 // Object.is equality
```

Now the failure says what is wrong: any three jars get the deal, not just plum ones. Small tests are quick to read, and when one fails there is only one place to look. Every detail you leave in is something else that could break it, and a test that also fails when the bag price changes sends the next person to the wrong line.

Fix the code only once a test shows the bug. Then the test passes, and it stays in the file, so the same bug cannot come back without someone hearing about it.

## Every case of a rule

The second job is the other way round: given a rule, which tests does it need? Say parking at the farm open day costs nothing for the first hour, 2 pounds up to 3 hours, and 5 pounds after that. The rule splits every stay into three groups that the code treats alike: up to 1 hour, over 1 and up to 3, and over 3. Each group needs a test, since each has its own price that could be wrong.

Then the lines between them, which you met in "Testing the edges". Each line has two sides: the longest stay at one price and the shortest at the next. With hours as whole numbers, that is 1 and 2, then 3 and 4. And the case with nothing: a stay of no time at all.

Write the cases down before any test. A table of hours and prices, worked out by hand from the rule, is the plan.

## A hundred tests of the same case

Lorcan liked tests. The same idea in parking would be:

```js
test('half an hour is free', () => {
  expect(parkingFee(0.5)).toBe(0)
})

test('Ada parks for half an hour', () => {
  expect(parkingFee(0.5)).toBe(0)
})
```

The second test proves nothing the first did not. Every mistake that breaks one breaks the other, and a mistake at 3 hours breaks neither. A hundred tests of short stays would all be green while every long stay is charged wrong. What counts is not how many tests there are, but how many different cases they try.

Check tells you when two of your tests fail on exactly the same wrong versions: they test the same case. It also tells you when a test fails on none of them, like a test that compares the code with itself, because it can never catch a mistake.

## Your work in this issue

Open `src/bill.test.js`; the code is in `src/bill.js`. Write the smallest test for Nell's bill first and watch it fail, then fix `bill`, then go through Lorcan's egg tests. Run `npx vitest run src/bill.test.js` after each change, and press Check when you are done.

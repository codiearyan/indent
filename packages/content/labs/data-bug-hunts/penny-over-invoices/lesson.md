# Invoices a penny over

## What you will be able to do

Wrenhaven Scores publishes choral arrangements from a converted chapel and licenses them to choirs in Britain, Sweden, Canada, India and Japan. Its invoices come from JavaScript you have just inherited, and each issue in this repo is a ticket about a date, an amount or a piece of text that came out wrong for a customer. By the end of this one you will be able to:

- say why decimal amounts drift, and why rounding at the end does not save them
- prove a money bug with a test that fails on the broken code
- keep money in whole pence and decide once where rounding happens
- test the case next to a ticket

## The ticket

Nadia Farrant founded Wrenhaven and writes most of the arrangements. She forwards an email with a short note on top.

> **Nadia:** WH-31. The director of Cedar Narrows Choir added up their invoice. The two lines come to 101.80 with VAT, and we charged them 101.81. She is right, and Marek found more like it in the log.

Marek Brzezinski keeps the accounts and sends the invoices.

Invoice WH-2291, as the code printed it:

```
Psalm 23, SATB    net 59.52   VAT 11.90
Evening round     net 25.32   VAT  5.06
Invoice           net 84.84   VAT 16.97   total 101.81
```

## Why the pennies drift

A JavaScript number is stored in binary, which holds halves and quarters exactly but not tenths or hundredths, so `1.86` is really the nearest binary value, a hair away. Usually the hair is too small to see:

```js
console.log(0.1 + 0.2) // 0.30000000000000004
console.log((1.005).toFixed(2)) // '1.00': 1.005 is stored as 1.00499999...
console.log(Math.round(1.005 * 100)) // 100, not 101
```

`toFixed(2)` turns a number into text with two decimals by rounding the value that is really stored. `Math.round` rounds to the nearest whole number, and a value exactly on the half goes up: `Math.round(2.5)` is `3`. Neither can know you meant exactly half a penny when the number in memory is a hair under it.

The invoice above has a second problem, the one Nadia saw. Each line's VAT is rounded on its line, but the invoice's VAT is worked out again from the unrounded net and rounded once more. 11.904 rounds down to 11.90 and 5.064 to 5.06, but their exact sum, 16.968, rounds up to 16.97. Rounded in two places, the parts and the whole stop agreeing.

## Decide once where rounding happens

The fix is a written rule that the code follows:

1. Turn every amount into whole pence once, at the edge. Whole numbers are exact in JavaScript up to about nine thousand trillion, so sums and products of pence never drift. `Math.round(fee * 100)` is safe here because a fee has at most two decimals: rounding only removes the hair.
2. Round where the rule says, and only there. Wrenhaven rounds each line's VAT, on that line, to the nearest penny, half a penny up.
3. Build everything else from what the lines show. The invoice's VAT is the sum of the lines' VAT, so the total always equals its parts.
4. Turn pence into text with two decimals only at the very end.

Two shortcuts look careful and are wrong. `toFixed` on a float total hides the drift until an amount lands on a half. Adding a small number before rounding, such as `0.001` or `Number.EPSILON`, moves the problem: a big nudge rounds up amounts that should go down, and a tiny one does not help larger amounts.

## Catch it with a test first

In a bug hunt you prove the bug before you touch the code: a test that fails on the shop's code today and passes once it is fixed, and stays so the bug never comes back.

`src/invoice.test.js` has two `describe` blocks. The first, `'the ticket'`, is for tests of what the ticket reports. A test does not have to know the answer by heart: it can add up the lines an invoice shows and expect the total to equal that sum, which is exactly what the choir director did.

Check runs your tests beside the shop's `invoice.js`, where they must fail, a right fix, where they must pass, and a wrong version, where they must fail too. For the ticket that version knows the ticket's own invoice by heart, so one invoice is not enough. Some bugs in this repo show only on some computers, so your tests run on three computers set to different time zones and languages, and your fix on five.

## The case next door

Next to "the totals disagree with the lines" sits "a line rounds the wrong way": a VAT of exactly half a penny, held a hair below the half. A fix that adds up the shown lines ends the ticket and keeps this bug. The `'next door'` block is for the test that would have caught it.

## Your work in this issue

Run `node src/demo.js` and add up each invoice. Then:

1. In `src/invoice.test.js`, write the ticket's tests and run `npx vitest run src/invoice.test.js`. They should fail.
2. Fix `invoice()` in `src/invoice.js`. Your tests turn green.
3. Write the test for the case next door.

Keep the names of the blocks, the function and the files as they are.

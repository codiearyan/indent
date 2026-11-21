# Receipts that are a cent off

## What you will be able to do

Cinderbay Paddle Co. rents kayaks and paddleboards from a little dock on the harbour. You are its only developer, and the till runs on JavaScript you inherited. By the end of this issue you will be able to:

- explain why `0.1 + 0.2` is not `0.3` in JavaScript, in one breath
- reproduce a receipt whose lines do not add up
- fix money code by working in whole cents
- write a test that catches the popular rounding fix that only hides the bug

## The ticket

Rosa Lindqvist owns Cinderbay. She sends you a photo of a receipt with a red circle on it.

> **Rosa:** A member asked me to check her receipt and she is right. 42.65 minus 4.26 is 38.39, not 38.38. And the member discount should be 4.27, ten percent of 42.65 is 4.265, we always round half a cent up. The bookkeeper found three more like this. Can you look at CPC-7?

The receipt from the till:

```
Double kayak, 1 hour      18.15
Paddleboard, 1 hour       24.50
Subtotal                  42.65
Member discount 10%       -4.26
Total                     38.38
```

## The idea: decimals are stored as binary fractions

A JavaScript number is a 64 bit binary floating point value. Binary fractions can store halves, quarters and eighths exactly, but not tenths or hundredths. So `18.15` is really the closest binary value, which is a tiny bit off. Most of the time the error is far too small to see. Then you hit a value that lands exactly on half a cent, and the tiny error decides which way it rounds.

```js
console.log(0.1 + 0.2) // 0.30000000000000004
console.log((1.005).toFixed(2)) // '1.00', because 1.005 is stored as 1.00499999...
console.log(Math.round(1.005 * 100)) // 100, not 101
```

That is why the bug "only happens on some totals". The receipt above has a subtotal of 42.65 and a discount of 4.265. The stored 4.265 is just below the half, so `toFixed` rounds it down. The total is rounded on its own, from a different slightly wrong value, so the three lines stop agreeing.

In an interview, say it like this: floats cannot represent most decimal fractions exactly, so money should be stored as an integer count of the smallest unit, and rounding should happen once, on purpose, by a rule you chose.

## How to reproduce it

Run the demo:

```
node src/demo.js
```

It prints receipts for three real orders from `src/orders.js`. Do the subtraction on each one yourself. Then make the bug visible in data: in `src/reproduce.js`, run the ticket order through `receipt()` and return what it showed next to the receipt you worked out by hand. Two objects that should be equal and are not is the proof you attach to CPC-7.

## How to fix it

Work in cents, which are whole numbers. Whole numbers up to about nine thousand trillion are exact in a JavaScript number, so sums and products of cents never drift.

1. Turn each price into cents once, at the edge, with `Math.round(price * 100)`. Prices have at most two decimals, so rounding here only removes the tiny binary error.
2. Add up the lines in cents.
3. Work out the discount in cents and round it once, half a cent up.
4. Subtract the rounded discount to get the total, so the receipt always adds up.
5. Divide by 100 only when you format the strings.

The obvious fix is to keep the floats and wrap every value in `Math.round(value * 100) / 100`. It looks careful and it is wrong. `4.265 * 100` is `426.49999999999994`, so the discount still rounds down, and because each line is rounded separately the total can still disagree with the other two. Rounding late cannot undo an error that is already in the value.

## How to test it

A good test here asserts whole receipts with `toEqual`, not just the total, and it uses orders where the cents are tricky. The ticket order is one: the original code gets the discount wrong, and so does the rounding fix. Add another order where the original prints a total that does not match its own lines, such as the group order.

Run your tests with `npx vitest run src/receipt.test.js`. The check runs them beside the original code, a correct fix and the round each value fix, and expects fail, pass, fail.

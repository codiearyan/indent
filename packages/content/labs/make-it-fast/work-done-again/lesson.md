# Work done again and again

## What you will be able to do

The match step no longer searches. Measure again and the picture has changed: match and money now take about the same time, and both are still far from fast. Neither searches a list. Both do work they have already done. By the end of this issue you can:

- move work that gives the same answer every time out of the loop
- sort once, at the end, instead of keeping a list sorted as it grows
- keep an answer so the same question is not asked twice, with the right key, for as long as it is true
- measure before you believe a rule of thumb about speed

## The request from Idris

> **Idris:** Match is down to almost nothing, and thank you. But the report still asks the price list thirty thousand times a night, though we only sell a couple of dozen things. And the ranking calls its comparison four million times for under four thousand customers. Sefton says that is just what sorting costs. Is it?

It is not. `node src/try.js` shows both numbers.

## Work that does not change

Here is a loop that turns every price on a menu into euros:

```js
menu.map((dish) => dish.pounds * rateFor(today))
```

The exchange rate is the same for every dish. Asking for it inside the loop asks the same question once per dish and gets the same answer every time. Ask once, before the loop, and the loop only multiplies:

```js
const rate = rateFor(today)
menu.map((dish) => dish.pounds * rate)
```

When the thing asked for inside a loop is itself a loop over the whole list, a total or a largest value, this is the loop inside the loop again, in a new coat. Look at each line inside a loop and ask: does this depend on the item the loop is on? If not, it belongs above the loop.

## Sorting as you go

Keeping a list in order while it grows sounds tidy. Done with `sort` after every new item, it is expensive: each sort goes over the whole list so far, which is nearly what the last sort already put in order. A list of a thousand names sorted after each name joins costs about half a million comparisons. Sorted once, at the end, it costs about ten thousand.

If nobody reads the list until it is complete, sort it when it is complete. If something does need it in order the whole way, put each new item straight into its place by searching the sorted list in halves. That costs about as little as one sort at the end.

## Adding text or joining it

A rule of thumb you will hear: building a long text with `+=` in a loop is slow, and you should collect the lines in an array and `join` them. In some languages that is true. Measure it here before you believe it: `src/try.js` times both on a text as long as the report. In JavaScript they take about the same time, because the engine is built for adding to text and does not copy it every time. So `printReport` can stay as it is.

That is the habit this repo is about. A speed-up you did not measure is a guess, and a rewrite for a guess costs time and risks the answer.

## Keeping an answer

When the same question comes up again and again, you can keep its answer the first time and look there afterwards. That is a cache:

```js
const rates = new Map()
function rate(from, to) {
  const key = `${from} ${to}`
  if (!rates.has(key)) rates.set(key, rateFor(from, to))
  return rates.get(key)
}
```

Two things make a cache wrong. The first is the key. It has to hold everything the answer depends on. Keyed on `from` alone, pounds to euros and pounds to dollars would share one answer, and every second figure would be wrong, quickly.

The second is time. A kept answer is only true while what it came from has not changed. The price list can change between two reports, so answers kept from one report must not be used in the next. Keep the cache inside the call that uses it, and a new call starts empty.

## Your work in this issue

All three tasks are in `src/report.js`: `addShares`, then `rankCustomers`, then `priceOrders`. Try your work with:

```sh
node src/try.js
```

It checks your answers against `src/old-report.js`, counts the comparisons and price questions of both versions, times them, and times the two ways of building text. In this copy of the shop each price question reads the whole price list again, as the shop's own does. The check uses rows, orders, a comparison and a price list of its own, which count how often they are used.

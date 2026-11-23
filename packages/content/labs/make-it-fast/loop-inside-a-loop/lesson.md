# The loop inside the loop

## What you will be able to do

Your measurements put the match step first: it takes more time than the other two steps together. This issue finds out why, and fixes it without changing one thing the report prints. The cause is the most common slow code there is, and once you have seen it you will spot it everywhere. By the end of this issue you can:

- spot a search hidden inside a loop, in `find`, `includes` and their relatives
- replace it with a `Map` or a `Set` built once, before the loop
- say how a piece of work grows when its input doubles, from two counts

## The request from Sefton

> **Sefton:** Your timings say match is the slow step, and I don't see how. It is two lines. One `map`, one `find`. I wrote it in five minutes and it was fine for years. If two lines can take the night, what hope is there for the rest?

Two lines can, because one of them is a loop you cannot see.

## A search inside a loop

Picture the shop's post room. Every parcel that comes in has a customer number on it, and the customer cards are in a box in no particular order. For each parcel, someone takes out the box and goes through the cards from the front until they find the right one. With ten parcels and twenty cards, nobody notices. With fifty thousand parcels and six thousand cards, that is about one hundred and fifty million cards turned over, because each parcel goes through half the box on average.

That is exactly what this does:

```js
parcels.map((parcel) => ({ ...parcel, card: cards.find((card) => card.no === parcel.no) }))
```

`map` is a loop over the parcels. `find` is a loop over the cards, from the front, until it meets the right one. Written on one line they look like one step, but the work is parcels times cards. `includes`, `indexOf`, `some` and `filter` are loops of the same kind: each goes through a list. Inside another loop, each multiplies.

A count makes it plain. Old `matchOrders` reads a customer's id hundreds of thousands of times for two thousand orders, many times for every customer.

## Build the lookup once

The post room's fix is old: sort the cards into a rack with one slot per number, once, before the parcels arrive. After that, each parcel goes straight to its slot.

In JavaScript the rack is a `Map`. You build it in one pass over the list, with the thing you look up by as the key, and then `get(key)` finds the value without going through anything:

```js
const cardByNo = new Map(cards.map((card) => [card.no, card]))
parcels.map((parcel) => ({ ...parcel, card: cardByNo.get(parcel.no) }))
```

Now the work is cards plus parcels, not cards times parcels. When all you need to know is whether something is on a list, not what goes with it, a `Set` is the same idea: built once from the list, `has(value)` answers at once. A plain object used as a lookup works too.

Two traps sit close to this. A `Map` built inside the loop is built again for every parcel, which is the old work and more. And a helper such as `cardFor(cards, no)` that still calls `find` hides the search without removing it. What matters is that the list is gone through once, before the loop.

Keep the answer the same, too. Sefton's code gives the record of the customer whose id the order holds. Yours must give exactly that, for every order, in the same order. That is the rule of this whole repo: fast and wrong is not fast.

## Doubling the orders

Here is a way to tell these two kinds of code apart without reading them. Count the work at some size, then at twice that size, and divide.

If the count stays about the same, the work does not depend on the size. If it doubles, the work grows with the input: one look per order. If it becomes about four times as big, the work grows with the square: every order meets every customer. Real counts are rarely exactly 2 or 4, because some fixed work or a sort moves them a little, so you take the nearest.

That ratio is a forecast. Work that doubles stays a night's work when the shop doubles. Work that grows four times turns one night into four, and then into sixteen.

## Your work in this issue

The first two tasks are in `src/report.js`: `matchOrders`, then `tradeOrders`, which has the same problem with `includes`. The third is `growth` in `src/measure.js`. Try your work with:

```sh
node src/try.js
```

It checks your answers against `src/old-report.js`, times both versions, and counts the customer ids each reads at two sizes. The check does not use the shop's data: it brings shops of its own, with records that count how often they are read.
